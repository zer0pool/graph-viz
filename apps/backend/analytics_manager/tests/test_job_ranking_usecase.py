"""
Unit tests for JobRankingUseCase.

Covers:
  A. Cache behavior    — HIT / MISS / empty BQ / BQ exception
  B. Redis resilience  — GET failure / SET failure
  C. Limit slicing     — limit applied correctly from cached vs fresh data
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.application.usecase.job_explorer.job_ranking import (
    CACHE_KEY_DURATION,
    CACHE_KEY_SLOT,
    CACHE_TTL,
    CACHE_TTL_EMPTY,
    JobRankingUseCase,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

SAMPLE_SLOT_ROW = {
    "job_id": "ml-platform.SELF-TYPE_L2_JOB_003",
    "type": "SELF-TYPE",
    "value_yesterday": 720000.0,
    "value_7d_avg": 695000.0,
    "change_pct": 3.6,
    "history_7d": [680000.0, 690000.0, 700000.0, 685000.0, 710000.0, 695000.0, 720000.0],
}

SAMPLE_DURATION_ROW = {
    "job_id": "ml-platform.SELF-TYPE_L2_JOB_003",
    "type": "SELF-TYPE",
    "value_yesterday": 10200.0,
    "value_7d_avg": 9900.0,
    "change_pct": 3.0,
    "history_7d": [9800.0, 9850.0, 9900.0, 9950.0, 9750.0, 9900.0, 10200.0],
}


def make_rows(n: int, base: dict) -> list[dict]:
    return [{**base, "job_id": f"job_{i}"} for i in range(n)]


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.get_slot_ranking = MagicMock(return_value=[SAMPLE_SLOT_ROW])
    repo.get_duration_ranking = MagicMock(return_value=[SAMPLE_DURATION_ROW])
    return repo


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    return redis


@pytest.fixture
def usecase(mock_repo, mock_redis):
    return JobRankingUseCase(repo=mock_repo, redis=mock_redis)


# ---------------------------------------------------------------------------
# A. Cache behavior
# ---------------------------------------------------------------------------

class TestCacheHit:
    @pytest.mark.asyncio
    async def test_slot_cache_hit_returns_cached_data(self, usecase, mock_redis, mock_repo):
        cached = [SAMPLE_SLOT_ROW]
        mock_redis.get.return_value = json.dumps(cached)

        result = await usecase.get_slot_ranking(limit=10)

        assert result == cached
        mock_repo.get_slot_ranking.assert_not_called()

    @pytest.mark.asyncio
    async def test_duration_cache_hit_returns_cached_data(self, usecase, mock_redis, mock_repo):
        cached = [SAMPLE_DURATION_ROW]
        mock_redis.get.return_value = json.dumps(cached)

        result = await usecase.get_duration_ranking(limit=10)

        assert result == cached
        mock_repo.get_duration_ranking.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_hit_uses_correct_key_for_slot(self, usecase, mock_redis):
        mock_redis.get.return_value = json.dumps([SAMPLE_SLOT_ROW])
        await usecase.get_slot_ranking()
        mock_redis.get.assert_called_once_with(CACHE_KEY_SLOT)

    @pytest.mark.asyncio
    async def test_cache_hit_uses_correct_key_for_duration(self, usecase, mock_redis):
        mock_redis.get.return_value = json.dumps([SAMPLE_DURATION_ROW])
        await usecase.get_duration_ranking()
        mock_redis.get.assert_called_once_with(CACHE_KEY_DURATION)


class TestCacheMiss:
    @pytest.mark.asyncio
    async def test_slot_cache_miss_fetches_from_repo(self, usecase, mock_repo):
        result = await usecase.get_slot_ranking()
        mock_repo.get_slot_ranking.assert_called_once()
        assert result == [SAMPLE_SLOT_ROW]

    @pytest.mark.asyncio
    async def test_duration_cache_miss_fetches_from_repo(self, usecase, mock_repo):
        result = await usecase.get_duration_ranking()
        mock_repo.get_duration_ranking.assert_called_once()
        assert result == [SAMPLE_DURATION_ROW]

    @pytest.mark.asyncio
    async def test_cache_miss_stores_result_with_ttl(self, usecase, mock_redis):
        await usecase.get_slot_ranking()
        mock_redis.set.assert_called_once()
        args, kwargs = mock_redis.set.call_args
        assert args[0] == CACHE_KEY_SLOT
        assert json.loads(args[1]) == [SAMPLE_SLOT_ROW]
        assert kwargs.get("ex") == CACHE_TTL

    @pytest.mark.asyncio
    async def test_empty_bq_result_uses_short_ttl(self, usecase, mock_repo, mock_redis):
        mock_repo.get_slot_ranking.return_value = []

        result = await usecase.get_slot_ranking()

        assert result == []
        _, kwargs = mock_redis.set.call_args
        assert kwargs.get("ex") == CACHE_TTL_EMPTY

    @pytest.mark.asyncio
    async def test_bq_exception_returns_empty_and_stores_empty(self, usecase, mock_repo, mock_redis):
        mock_repo.get_slot_ranking.side_effect = Exception("BigQuery unreachable")

        result = await usecase.get_slot_ranking()

        assert result == []
        _, kwargs = mock_redis.set.call_args
        assert kwargs.get("ex") == CACHE_TTL_EMPTY


# ---------------------------------------------------------------------------
# B. Redis resilience
# ---------------------------------------------------------------------------

class TestRedisResilience:
    @pytest.mark.asyncio
    async def test_redis_get_failure_falls_through_to_repo(self, usecase, mock_redis, mock_repo):
        mock_redis.get.side_effect = ConnectionError("Redis down")

        result = await usecase.get_slot_ranking()

        mock_repo.get_slot_ranking.assert_called_once()
        assert result == [SAMPLE_SLOT_ROW]

    @pytest.mark.asyncio
    async def test_redis_set_failure_does_not_raise(self, usecase, mock_redis):
        mock_redis.set.side_effect = ConnectionError("Redis down")

        # Should not raise — SET failure is logged and swallowed
        result = await usecase.get_slot_ranking()
        assert result == [SAMPLE_SLOT_ROW]

    @pytest.mark.asyncio
    async def test_redis_get_and_set_both_fail_still_returns_data(self, usecase, mock_redis, mock_repo):
        mock_redis.get.side_effect = ConnectionError("Redis down")
        mock_redis.set.side_effect = ConnectionError("Redis down")

        result = await usecase.get_slot_ranking()
        assert result == [SAMPLE_SLOT_ROW]


# ---------------------------------------------------------------------------
# C. Limit slicing
# ---------------------------------------------------------------------------

class TestLimitSlicing:
    @pytest.mark.asyncio
    async def test_limit_applied_to_cached_data(self, usecase, mock_redis):
        rows = make_rows(20, SAMPLE_SLOT_ROW)
        mock_redis.get.return_value = json.dumps(rows)

        result = await usecase.get_slot_ranking(limit=5)
        assert len(result) == 5

    @pytest.mark.asyncio
    async def test_limit_applied_to_fresh_data(self, usecase, mock_repo):
        mock_repo.get_slot_ranking.return_value = make_rows(20, SAMPLE_SLOT_ROW)

        result = await usecase.get_slot_ranking(limit=7)
        assert len(result) == 7

    @pytest.mark.asyncio
    async def test_limit_larger_than_data_returns_all(self, usecase, mock_redis):
        rows = make_rows(3, SAMPLE_SLOT_ROW)
        mock_redis.get.return_value = json.dumps(rows)

        result = await usecase.get_slot_ranking(limit=30)
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_duration_limit_slicing(self, usecase, mock_repo):
        mock_repo.get_duration_ranking.return_value = make_rows(15, SAMPLE_DURATION_ROW)

        result = await usecase.get_duration_ranking(limit=10)
        assert len(result) == 10

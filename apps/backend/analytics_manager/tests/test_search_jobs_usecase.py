"""
Unit tests for SearchJobsUseCase.

Covers:
  A. Cache behavior       — HIT / MISS / refresh bypass / empty BQ / BQ exception
  B. Redis resilience     — GET failure / SET failure
  C. Data mapping logic   — issuer fallback, metadata fallback, empty job_id skip
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest

from app.application.usecase.job_explorer.search_jobs import (
    CACHE_KEY,
    CACHE_TTL,
    CACHE_TTL_EMPTY,
    SearchJobsUseCase,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

BQ_ROW_JOB1 = {
    "job_id": "job1",
    "dag_id": "dag1",
    "execution_time": "2025-01-01T00:00:00Z",
    "next_start_time": "2025-01-02T00:00:00Z",
    "publish_time": "2025-01-01T01:00:00Z",
    "destination": "dest_a",
    "issuer": None,
    "period": "daily",
    "date": "2025-01-01",
    "hour": "0",
    "duration": None,
    "progress": None,
}

BQ_ROW_JOB2 = {
    "job_id": "job2",
    "dag_id": "dag2",
    "execution_time": "2025-01-01T00:00:00Z",
    "next_start_time": "",
    "publish_time": "",
    "destination": None,
    "issuer": None,
    "period": None,
    "date": None,
    "hour": None,
    "duration": None,
    "progress": None,
}

METADATA_MAP = {
    "job1": {
        "name": "Test Job 1",
        "project_id": "proj_a",
        "owners": ["owner1"],
        "properties": {"type": "SELF-TYPE", "status": "Active"},
    },
    "job2": {
        "name": "Test Job 2",
        "project_id": "proj_b",
        "owners": ["owner2"],
        "properties": {"type": "REQUEST-TYPE", "status": "Completed"},
    },
}


def _make_uc(
    bq_rows=None,
    metadata_map=None,
    redis_get_value=None,
    redis_get_side_effect=None,
    redis_set_side_effect=None,
):
    """Factory: returns (usecase, mock_redis, mock_repo, mock_gateway)."""
    mock_redis = AsyncMock()
    if redis_get_side_effect:
        mock_redis.get.side_effect = redis_get_side_effect
    else:
        mock_redis.get.return_value = (
            json.dumps(redis_get_value) if redis_get_value is not None else None
        )
    if redis_set_side_effect:
        mock_redis.set.side_effect = redis_set_side_effect

    mock_repo = MagicMock()
    mock_repo.get_recent_runs.return_value = bq_rows if bq_rows is not None else []

    mock_gateway = AsyncMock()
    mock_gateway.get_jobs_batch.return_value = (
        metadata_map if metadata_map is not None else {}
    )

    uc = SearchJobsUseCase(
        repo=mock_repo, lineage_gateway=mock_gateway, redis=mock_redis
    )
    return uc, mock_redis, mock_repo, mock_gateway


# ---------------------------------------------------------------------------
# Helper: patch asyncio.to_thread to call the repo synchronously in tests
# ---------------------------------------------------------------------------

def _patch_to_thread(bq_rows):
    """Returns an AsyncMock that ignores thread-pool logic and returns bq_rows."""
    return patch(
        "app.application.usecase.job_explorer.search_jobs.asyncio.to_thread",
        new=AsyncMock(return_value=bq_rows),
    )


# ===========================================================================
# Group A: Cache behavior
# ===========================================================================


@pytest.mark.asyncio
async def test_cache_hit_returns_data_without_bq_call():
    """Cache HIT: cached payload returned immediately; BQ and lineage not called."""
    cached_payload = [{"job_id": "cached_job", "name": "Cached"}]
    uc, mock_redis, mock_repo, mock_gateway = _make_uc(
        redis_get_value=cached_payload
    )

    with _patch_to_thread([]) as mock_thread:
        results = await uc.execute(refresh=False)

    assert results == cached_payload
    mock_thread.assert_not_called()
    mock_gateway.get_jobs_batch.assert_not_called()
    mock_redis.set.assert_not_called()


@pytest.mark.asyncio
async def test_cache_miss_fetches_from_bq_and_stores_cache():
    """Cache MISS: BQ fetched, lineage joined, result stored in Redis."""
    bq_rows = [BQ_ROW_JOB1, BQ_ROW_JOB2]
    uc, mock_redis, _, mock_gateway = _make_uc(
        bq_rows=bq_rows, metadata_map=METADATA_MAP, redis_get_value=None
    )

    with _patch_to_thread(bq_rows):
        results = await uc.execute(refresh=False)

    assert len(results) == 2
    mock_gateway.get_jobs_batch.assert_called_once()
    mock_redis.set.assert_called_once()

    # Verify TTL used for non-empty result (settings value or module default)
    set_call_kwargs = mock_redis.set.call_args
    assert set_call_kwargs.kwargs.get("ex") or set_call_kwargs.args[2]


@pytest.mark.asyncio
async def test_refresh_true_bypasses_cache():
    """refresh=True skips cache even when Redis has data, then stores fresh result."""
    cached_payload = [{"job_id": "stale_job"}]
    bq_rows = [BQ_ROW_JOB1]
    uc, mock_redis, _, mock_gateway = _make_uc(
        bq_rows=bq_rows,
        metadata_map=METADATA_MAP,
        redis_get_value=cached_payload,
    )

    with _patch_to_thread(bq_rows):
        results = await uc.execute(refresh=True)

    # Should NOT return the stale cached payload
    assert not any(r.get("job_id") == "stale_job" for r in results)
    mock_redis.get.assert_not_called()
    mock_redis.set.assert_called_once()


@pytest.mark.asyncio
async def test_bq_empty_result_caches_with_short_ttl():
    """BQ returns []: result cached with CACHE_TTL_EMPTY (short TTL), returns []."""
    uc, mock_redis, _, _ = _make_uc(bq_rows=[], redis_get_value=None)

    with _patch_to_thread([]):
        results = await uc.execute(refresh=False)

    assert results == []
    mock_redis.set.assert_called_once()

    set_args = mock_redis.set.call_args
    stored_key = set_args.args[0]
    stored_data = json.loads(set_args.args[1])
    stored_ttl = set_args.kwargs.get("ex")

    assert stored_key == CACHE_KEY
    assert stored_data == []
    assert stored_ttl == CACHE_TTL_EMPTY


@pytest.mark.asyncio
async def test_bq_exception_caches_empty_and_returns_empty():
    """BQ raises: empty result cached with short TTL, [] returned (no crash)."""
    uc, mock_redis, _, _ = _make_uc(redis_get_value=None)

    with patch(
        "app.application.usecase.job_explorer.search_jobs.asyncio.to_thread",
        new=AsyncMock(side_effect=RuntimeError("BQ unavailable")),
    ):
        results = await uc.execute(refresh=False)

    assert results == []
    mock_redis.set.assert_called_once()

    set_args = mock_redis.set.call_args
    assert json.loads(set_args.args[1]) == []
    assert set_args.kwargs.get("ex") == CACHE_TTL_EMPTY


# ===========================================================================
# Group B: Redis resilience
# ===========================================================================


@pytest.mark.asyncio
async def test_redis_get_failure_falls_back_to_bq():
    """Redis.get() raises: treated as cache miss, BQ is called, result returned."""
    bq_rows = [BQ_ROW_JOB1]
    uc, mock_redis, _, mock_gateway = _make_uc(
        bq_rows=bq_rows,
        metadata_map=METADATA_MAP,
        redis_get_side_effect=Exception("Redis connection lost"),
    )

    with _patch_to_thread(bq_rows):
        results = await uc.execute(refresh=False)

    assert len(results) == 1
    mock_gateway.get_jobs_batch.assert_called_once()


@pytest.mark.asyncio
async def test_redis_set_failure_is_silent():
    """Redis.set() raises: no crash, result still returned to caller."""
    bq_rows = [BQ_ROW_JOB1]
    uc, mock_redis, _, _ = _make_uc(
        bq_rows=bq_rows,
        metadata_map=METADATA_MAP,
        redis_get_value=None,
        redis_set_side_effect=Exception("Redis write error"),
    )

    with _patch_to_thread(bq_rows):
        results = await uc.execute(refresh=False)

    assert len(results) == 1
    assert results[0]["job_id"] == "job1"


# ===========================================================================
# Group C: Data mapping logic
# ===========================================================================


@pytest.mark.asyncio
async def test_issuer_mapping_self_type():
    """No issuer in BQ row + SELF-TYPE metadata → issuer = 'Self Scheduling'."""
    bq_rows = [{**BQ_ROW_JOB1, "issuer": None}]
    meta = {"job1": {"name": "J1", "project_id": "p", "owners": [], "properties": {"type": "SELF-TYPE"}}}
    uc, mock_redis, _, _ = _make_uc(bq_rows=bq_rows, metadata_map=meta, redis_get_value=None)

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert results[0]["issuer"] == "Self Scheduling"


@pytest.mark.asyncio
async def test_issuer_mapping_request_type():
    """No issuer in BQ row + REQUEST-TYPE metadata → issuer = 'Data Scheduling'."""
    bq_rows = [{**BQ_ROW_JOB2, "issuer": None}]
    meta = {"job2": {"name": "J2", "project_id": "p", "owners": [], "properties": {"type": "REQUEST-TYPE"}}}
    uc, mock_redis, _, _ = _make_uc(bq_rows=bq_rows, metadata_map=meta, redis_get_value=None)

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert results[0]["issuer"] == "Data Scheduling"


@pytest.mark.asyncio
async def test_issuer_mapping_unknown_type_falls_back_to_system():
    """No issuer in BQ row + unknown/None type → issuer = 'System'."""
    bq_rows = [{**BQ_ROW_JOB1, "issuer": None}]
    meta = {"job1": {"name": "J1", "project_id": "p", "owners": [], "properties": {"type": None}}}
    uc, mock_redis, _, _ = _make_uc(bq_rows=bq_rows, metadata_map=meta, redis_get_value=None)

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert results[0]["issuer"] == "System"


@pytest.mark.asyncio
async def test_bq_issuer_takes_priority_over_metadata_type():
    """If BQ row already has issuer set, it is preserved regardless of job type."""
    bq_rows = [{**BQ_ROW_JOB1, "issuer": "External Trigger"}]
    meta = {"job1": {"name": "J1", "project_id": "p", "owners": [], "properties": {"type": "SELF-TYPE"}}}
    uc, mock_redis, _, _ = _make_uc(bq_rows=bq_rows, metadata_map=meta, redis_get_value=None)

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert results[0]["issuer"] == "External Trigger"


@pytest.mark.asyncio
async def test_row_without_job_id_is_skipped():
    """BQ rows with empty/missing job_id must be excluded from the result."""
    bq_rows = [
        {**BQ_ROW_JOB1},                        # valid
        {**BQ_ROW_JOB2, "job_id": ""},           # empty string → skip
        {**BQ_ROW_JOB2, "job_id": None},         # None → skip
    ]
    meta = {
        "job1": {"name": "J1", "project_id": "p", "owners": [], "properties": {"type": "SELF-TYPE"}},
    }
    uc, mock_redis, _, _ = _make_uc(bq_rows=bq_rows, metadata_map=meta, redis_get_value=None)

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert len(results) == 1
    assert results[0]["job_id"] == "job1"


@pytest.mark.asyncio
async def test_job_missing_from_metadata_uses_empty_meta():
    """Job not returned by lineage gateway → result row uses graceful empty defaults."""
    bq_rows = [{**BQ_ROW_JOB1}]
    uc, mock_redis, _, _ = _make_uc(
        bq_rows=bq_rows,
        metadata_map={},  # lineage returned nothing
        redis_get_value=None,
    )

    with _patch_to_thread(bq_rows):
        results = await uc.execute()

    assert len(results) == 1
    row = results[0]
    assert row["job_id"] == "job1"
    assert row["name"] is None
    assert row["project_id"] is None
    assert row["owners"] == []
    assert row["type"] is None
    assert row["issuer"] == "System"  # No type → falls back to System

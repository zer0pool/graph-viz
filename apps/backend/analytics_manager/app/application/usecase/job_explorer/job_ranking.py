import asyncio
import json
import logging
from typing import Any, Dict, List

from redis.asyncio import Redis

from app.domain.repository.job_repository import JobExplorerRepository

logger = logging.getLogger(__name__)

CACHE_KEY_SLOT = "job_ranking:slot"
CACHE_KEY_DURATION = "job_ranking:duration"
CACHE_TTL = 600  # 10 minutes
CACHE_TTL_EMPTY = 60  # 1 minute when BQ returns no data


class JobRankingUseCase:
    def __init__(self, repo: JobExplorerRepository, redis: Redis):
        self.repo = repo
        self.redis = redis

    async def get_slot_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return await self._get_or_fetch(
            CACHE_KEY_SLOT,
            limit,
            lambda: self.repo.get_slot_ranking(limit=30),
        )

    async def get_duration_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return await self._get_or_fetch(
            CACHE_KEY_DURATION,
            limit,
            lambda: self.repo.get_duration_ranking(limit=30),
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_or_fetch(
        self,
        cache_key: str,
        limit: int,
        fetch_fn,
    ) -> List[Dict[str, Any]]:
        cached = await self._get_cache(cache_key)
        if cached is not None:
            logger.info(f"[JobRanking] Cache HIT — {cache_key} ({len(cached)} rows)")
            return cached[:limit]

        logger.info(f"[JobRanking] Cache MISS — fetching {cache_key} from BigQuery")
        try:
            rows = await asyncio.to_thread(fetch_fn)
        except Exception as e:
            logger.error(f"[JobRanking] BigQuery fetch failed for {cache_key}: {e}")
            rows = []

        ttl = CACHE_TTL if rows else CACHE_TTL_EMPTY
        await self._set_cache(cache_key, rows, ttl)

        if not rows:
            logger.warning(
                f"[JobRanking] BigQuery returned 0 rows for {cache_key} — caching empty for {ttl}s"
            )

        return rows[:limit]

    async def _get_cache(self, key: str) -> List | None:
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"[JobRanking] Redis GET failed for '{key}': {e}")
        return None

    async def _set_cache(self, key: str, data: List, ttl: int) -> None:
        try:
            await self.redis.set(key, json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"[JobRanking] Redis SET failed for '{key}': {e}")

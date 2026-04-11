import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.repository.table_repository import TableListRepository

logger = logging.getLogger(__name__)

CACHE_KEY = "table_explorer:table_list"
CACHE_TTL = 600        # 10 minutes
CACHE_TTL_EMPTY = 60   # short TTL when BQ returns empty


class GetTableListUseCase:
    def __init__(self, repo: TableListRepository, redis: Redis):
        self.repo = repo
        self.redis = redis

    async def execute(self, refresh: bool = False) -> List[Dict[str, Any]]:
        if not refresh:
            cached = await self._get_from_cache(CACHE_KEY)
            if cached is not None:
                logger.info(f"[TableExplorer] Cache HIT — returning {len(cached)} rows")
                return cached
            logger.info("[TableExplorer] Cache MISS — fetching from BigQuery")

        try:
            rows = await asyncio.to_thread(self.repo.get_table_list)
            logger.info(f"[TableExplorer] BigQuery returned {len(rows)} rows")
        except Exception as e:
            logger.error(f"[TableExplorer] Failed to fetch table list: {e}")
            rows = []

        if not rows:
            ttl_empty = getattr(settings, "ANALYTICS_CACHE_TTL_EMPTY_SEC", CACHE_TTL_EMPTY)
            await self._set_cache(CACHE_KEY, [], ttl=ttl_empty)
            logger.warning(
                f"[TableExplorer] BigQuery returned 0 rows — caching empty for {ttl_empty}s"
            )
            return []

        ttl = getattr(settings, "ANALYTICS_CACHE_TTL_SEC", CACHE_TTL)
        await self._set_cache(CACHE_KEY, rows, ttl=ttl)
        logger.info(f"[TableExplorer] Cached {len(rows)} rows with TTL={ttl}s")
        return rows

    async def _get_from_cache(self, key: str) -> Optional[List]:
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"[TableExplorer] Redis GET failed for '{key}': {e}")
        return None

    async def _set_cache(self, key: str, data: List, ttl: int) -> None:
        try:
            await self.redis.set(key, json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"[TableExplorer] Redis SET failed for '{key}': {e}")

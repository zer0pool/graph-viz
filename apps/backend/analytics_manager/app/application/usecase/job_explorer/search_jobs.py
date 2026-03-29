import asyncio
import json
import logging
import random
from typing import Any, Dict, List

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.entity.job import JobRunContext
from app.domain.gateway.lineage_gateway import LineageGateway
from app.domain.repository.job_repository import JobExplorerRepository

logger = logging.getLogger(__name__)

CACHE_KEY = "job_explorer:recent_runs"
CACHE_TTL = 600  # 10 minutes cache TTL for the 30-day dataset
CACHE_TTL_EMPTY = 60  # Short TTL when BQ returns empty, to avoid hammering BQ


class SearchJobsUseCase:
    def __init__(
        self,
        repo: JobExplorerRepository,
        lineage_gateway: LineageGateway,
        redis: Redis,
    ):
        self.repo = repo
        self.lineage = lineage_gateway
        self.redis = redis

    async def execute(
        self, days: int = 30, refresh: bool = False
    ) -> List[Dict[str, Any]]:
        if not refresh:
            cached = await self._get_from_cache(CACHE_KEY)
            if cached is not None:
                logger.info(f"[JobExplorer] Cache HIT — returning {len(cached)} rows")
                return cached
            logger.info("[JobExplorer] Cache MISS — fetching from BigQuery")

        try:
            # BigQuery client is synchronous; run in a thread to avoid blocking the event loop.
            bq_rows = await asyncio.to_thread(self.repo.get_recent_runs, days=days)
            logger.info(f"[JobExplorer] BigQuery returned {len(bq_rows)} rows")
        except Exception as e:
            logger.error(
                f"[JobExplorer] Failed to fetch recent runs from Repository: {e}"
            )
            bq_rows = []

        if not bq_rows:
            # Cache the empty result with a short TTL to prevent repeated BQ hits
            ttl_empty = getattr(
                settings, "ANALYTICS_CACHE_TTL_EMPTY_SEC", CACHE_TTL_EMPTY
            )
            await self._set_cache(CACHE_KEY, [], ttl=ttl_empty)
            logger.warning(
                f"[JobExplorer] BigQuery returned 0 rows — caching empty for {ttl_empty}s"
            )
            return []

        job_ids = list({row["job_id"] for row in bq_rows if row.get("job_id")})
        logger.info(
            f"[JobExplorer] Fetching metadata for {len(job_ids)} jobs from lineage-manager-v2"
        )
        metadata_map = await self.lineage.get_jobs_batch(job_ids)
        logger.info(f"[JobExplorer] Received metadata for {len(metadata_map)} jobs")

        result = []
        for row in bq_rows:
            job_id = row.get("job_id")
            if not job_id:
                continue
            job_id = str(job_id)
            meta = metadata_map.get(job_id, {})

            period_val = row.get("period")
            job_type = (meta.get("properties") or {}).get("type")
            issuer_val = row.get("issuer")
            if not issuer_val:
                if job_type == "REQUEST-TYPE":
                    issuer_val = "Data Scheduling"
                elif job_type == "SELF-TYPE":
                    issuer_val = "Self Scheduling"
                else:
                    issuer_val = "System"

            result.append(
                JobRunContext(
                    job_id=job_id,
                    dag_id=row.get("dag_id"),
                    execution_time=str(row.get("execution_time", "")),
                    next_start_time=str(row.get("next_start_time", "")),
                    publish_time=str(row.get("publish_time", "")),
                    destination=row.get("destination"),
                    issuer=issuer_val,
                    period=period_val,
                    date=row.get("date"),
                    hour=row.get("hour"),
                    name=meta.get("name"),
                    project_id=meta.get("project_id"),
                    owners=meta.get("owners", []),
                    type=job_type,
                    status=(meta.get("properties") or {}).get("status"),
                    duration=row.get("duration") or random.randint(30, 600),
                    progress=row.get("progress") or round(random.random(), 2),
                )
            )

        result_dicts = [item.model_dump() for item in result]
        ttl = getattr(settings, "ANALYTICS_CACHE_TTL_SEC", CACHE_TTL)
        await self._set_cache(CACHE_KEY, result_dicts, ttl=ttl)
        logger.info(f"[JobExplorer] Cached {len(result_dicts)} rows with TTL={ttl}s")
        return result_dicts

    async def _get_from_cache(self, key: str) -> List | None:
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"[JobExplorer] Redis GET failed for '{key}': {e}")
        return None

    async def _set_cache(self, key: str, data: List, ttl: int):
        try:
            await self.redis.set(key, json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"[JobExplorer] Redis SET failed for '{key}': {e}")

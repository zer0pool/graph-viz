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
                return cached

        try:
            # Fetch last `days` of data (defaults to 30) instead of a hard limit
            bq_rows = self.repo.get_recent_runs(days=days)
        except Exception as e:
            logger.error(f"Failed to fetch recent runs from Repository: {e}")
            bq_rows = []

        if not bq_rows:
            return []

        job_ids = list({row["job_id"] for row in bq_rows if row.get("job_id")})
        metadata_map = await self.lineage.get_jobs_batch(job_ids)

        result = []
        for row in bq_rows:
            job_id = str(row.get("job_id", ""))
            if not job_id:
                continue
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
        await self._set_cache(
            CACHE_KEY, result_dicts, ttl=ttl
        )
        return result_dicts

    async def _get_from_cache(self, key: str) -> List | None:
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Redis GET failed for '{key}': {e}")
        return None

    async def _set_cache(self, key: str, data: List, ttl: int):
        try:
            await self.redis.set(key, json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"Redis SET failed for '{key}': {e}")

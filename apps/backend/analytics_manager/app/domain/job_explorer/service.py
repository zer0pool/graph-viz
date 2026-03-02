import json
import logging
from typing import Any, Dict, List, Optional
from redis.asyncio import Redis
import random

from app.domain.job_explorer.repository import JobExplorerRepository
from app.infrastructure.lineage_client import LineageClient

logger = logging.getLogger(__name__)

CACHE_KEY = "job_explorer:recent_runs"
CACHE_TTL = 300

class JobExplorerService:
    def __init__(
        self,
        repo: JobExplorerRepository,
        lineage_client: LineageClient,
        redis: Redis,
    ):
        self.repo = repo
        self.lineage = lineage_client
        self.redis = redis

    async def get_recent_job_runs(self, limit: int = 100, refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch the most recent job execution records, join with metadata.
        """
        from app.core.config import settings

        # 1. Try cache first if not refreshing
        if not refresh:
            cached = await self._get_from_cache(CACHE_KEY)
            if cached is not None:
                return cached[:limit]

        # 2. Fetch raw execution data from Repository (BigQuery)
        try:
            bq_rows = self.repo.get_recent_runs(limit=limit)
        except Exception as e:
            logger.error(f"Failed to fetch recent runs from BigQuery: {e}")
            bq_rows = []

        if not bq_rows:
            return []

        # 3. Extract job_ids and batch-fetch metadata from lineage-manager-v2
        job_ids = list({row["job_id"] for row in bq_rows if row.get("job_id")})
        metadata_map = await self.lineage.get_jobs_batch(job_ids)

        # 4. Join BigQuery data with metadata
        result = []
        for row in bq_rows:
            job_id = str(row.get("job_id", ""))
            if not job_id: continue
            meta = metadata_map.get(job_id, {})
            
            # Use period if available from BQ
            period_val = row.get("period")
            
            # Map issuer: "Data Scheduling" or "Self Scheduling"
            # Logic: If meta type is REQUEST-TYPE -> Data Scheduling, if SELF-TYPE -> Self Scheduling
            job_type = (meta.get("properties") or {}).get("type")
            issuer_val = row.get("issuer")
            if not issuer_val:
                if job_type == "REQUEST-TYPE":
                    issuer_val = "Data Scheduling"
                elif job_type == "SELF-TYPE":
                    issuer_val = "Self Scheduling"
                else:
                    issuer_val = "System"

            result.append({
                "job_id": job_id,
                "dag_id": row.get("dag_id"),
                "execution_time": str(row.get("execution_time", "")),
                "next_start_time": str(row.get("next_start_time", "")),
                "publish_time": str(row.get("publish_time", "")),
                "destination": row.get("destination"),
                "issuer": issuer_val,
                "period": period_val,
                "date": row.get("date"),
                "hour": row.get("hour"),
                "name": meta.get("name"),
                "project_id": meta.get("project_id"),
                "owners": meta.get("owners", []),
                "type": job_type,
                "status": (meta.get("properties") or {}).get("status"),
                # dummy fields for UI if needed in future
                "duration": row.get("duration") or random.randint(30, 600),
                "progress": row.get("progress") or round(random.random(), 2),
            })

        # 5. Cache result (using settings.ANALYTICS_CACHE_TTL_SEC)
        ttl = getattr(settings, "ANALYTICS_CACHE_TTL_SEC", CACHE_TTL)
        await self._set_cache(CACHE_KEY, result, ttl=ttl)
        return result

    async def _get_from_cache(self, key: str) -> Optional[List]:
        try:
            value = await self.redis.get(key)
            if value: return json.loads(value)
        except Exception as e:
            logger.warning(f"Redis GET failed for '{key}': {e}")
        return None

    async def _set_cache(self, key: str, data: List, ttl: int):
        try:
            await self.redis.set(key, json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"Redis SET failed for '{key}': {e}")

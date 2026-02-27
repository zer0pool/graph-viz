"""
HTTP Client for calling lineage-manager-v2 internal APIs.
"""
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LineageClient:
    """Async HTTP client for lineage-manager-v2."""

    def __init__(self):
        self.base_url = settings.LINEAGE_MANAGER_V2_URL
        self.timeout = 10.0

    async def get_jobs_batch(self, job_ids: List[str]) -> Dict[str, Any]:
        """
        Calls POST /lineage-manager/api/v1/jobs/batch on lineage-manager-v2 
        to fetch metadata for multiple jobs.
        """
        if not job_ids:
            return {}

        url = f"{self.base_url}/lineage-manager/api/v1/jobs/batch"
        payload = {"job_ids": job_ids}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("results", {})
        except httpx.HTTPStatusError as e:
            logger.error(
                f"LineageClient batch request failed [{e.response.status_code}]: {e}"
            )
            return {}
        except Exception as e:
            logger.error(f"LineageClient unexpected error: {e}")
            return {}

    async def get_internal_stats(self) -> Dict[str, Any]:
        """
        Calls GET /lineage-manager/api/v1/internal/stats on lineage-manager-v2.
        """
        url = f"{self.base_url}/lineage-manager/api/v1/internal/stats"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"LineageClient failed to fetch internal stats: {e}")
            return {}

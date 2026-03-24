"""
HTTP Client for calling lineage-manager-v2 internal APIs.
"""

import logging
from typing import Any, Dict, List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LineageClient:
    """Async HTTP client for lineage-manager-v2."""

    def __init__(self):
        self.base_url = settings.LINEAGE_MANAGER_URL
        self.timeout = 10.0

    async def get_jobs_batch(self, job_ids: List[str]) -> Dict[str, Any]:
        """
        Calls POST /lineage-manager/api/v1/jobs/batch on lineage-manager-v2
        to fetch metadata for multiple jobs.
        """
        if not job_ids:
            return {}

        url = f"{self.base_url}/api/v1/jobs/batch"
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
        """Calls GET /api/v1/internal/stats on lineage-manager-v2."""
        url = f"{self.base_url}/api/v1/internal/stats"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"LineageClient failed to fetch internal stats: {e}")
            return {}

    async def track_visit(
        self, path: str, title: str | None, visitor_id: str | None
    ) -> bool:
        """Calls POST /api/v1/internal/track on lineage-manager-v2."""
        url = f"{self.base_url}/api/v1/internal/track"
        payload = {"path": path, "title": title, "visitor_id": visitor_id}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"LineageClient failed to track visit: {e}")
            return False

    async def get_top_visited(self, limit: int = 5, days: int = 7) -> Dict[str, Any]:
        """Calls GET /api/v1/internal/top-visited on lineage-manager-v2."""
        url = f"{self.base_url}/api/v1/internal/top-visited"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params={"limit": limit, "days": days})
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"LineageClient failed to fetch top-visited: {e}")
            return {"items": [], "window_days": days}

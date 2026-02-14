import httpx
from typing import List, Dict, Optional, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class JobManagerClient:
    """
    Async Client for Job Manager API.
    Refactored from V1 JobManagerAdapter.
    """

    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.JOB_MANAGER_URL
        self.timeout = 60.0
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"JobManager request failed: {method} {url} - {e}")
            raise

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        try:
            return await self._request("GET", f"/api/job/{job_id}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def fetch_lineages_by_ids(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch full lineage payloads for a list of job IDs.
        Returns raw dicts (schema validation happens in service layer).
        """
        # Assuming V1 API structure:
        # POST /api/v1/jobs/scheduling-lineage/by_ids {"jobs": [{"job_id": "..."}]}

        # Requests format matching V1 adapter
        job_requests = [{"job_id": jid} for jid in job_ids]

        data = await self._request(
            "POST",
            "/api/v1/jobs/scheduling-lineage/by_ids",
            json={"jobs": job_requests},
        )
        # response format: {result: [...]}
        return data.get("result", [])

    async def close(self):
        await self.client.aclose()

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from lineage_manager.core.config import get_settings
from lineage_manager.core.constants import SchedulingType
from lineage_manager.models.scheduling_lineage import (
    SchedulingLineage,
    SchedulingLineageResponse,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Port (Interface)
# ============================================================================

class JobManagerPort(ABC):
    """Port interface for Job Manager external service."""

    @abstractmethod
    async def get_all_jobs(
        self,
        limit: Optional[int] = None,
    ) -> List[SchedulingLineage]:
        """Fetch all jobs (SELF + REQUEST)."""

    @abstractmethod
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific job."""

    @abstractmethod
    async def get_job_run_history(self, job_id: str) -> List[Dict[str, Any]]:
        """Fetch run history for a job."""

    @abstractmethod
    async def fetch_lineages_by_ids(
        self,
        job_requests: List[Dict[str, str]],
    ) -> List[SchedulingLineage]:
        """Fetch scheduling lineages by job IDs."""


# ============================================================================
# Adapter (Implementation)
# ============================================================================

class JobManagerAdapter(JobManagerPort):
    """HTTP Adapter for Job Manager API."""

    def __init__(self, base_url: Optional[str] = None):
        settings = get_settings()
        self.base_url = base_url or settings.job_manager_url
        self.timeout = 60.0
        self.client = httpx.AsyncClient(timeout=self.timeout)

    # ----------------------------------------------------------------------
    # Low-level HTTP helper
    # ----------------------------------------------------------------------

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        json: dict | None = None,
    ) -> dict:
        url = f"{self.base_url}{path}"
        try:
            logger.debug(
                "JobManager API request: %s %s params=%s json=%s",
                method,
                url,
                params,
                json,
            )
            response = await self.client.request(
                method=method,
                url=url,
                params=params,
                json=json,
            )
            response.raise_for_status()
            return response.json()

        except httpx.HTTPError:
            logger.exception("JobManager API request failed: %s %s", method, url)
            raise

    # ----------------------------------------------------------------------
    # Pagination helper
    # ----------------------------------------------------------------------

    async def _fetch_paginated(
        self,
        path: str,
        params: dict,
    ) -> List[SchedulingLineage]:
        results: List[SchedulingLineage] = []
        offset = params.get("offset", 0)

        while True:
            params["offset"] = offset
            data = await self._request("GET", path, params=params)

            payload = SchedulingLineageResponse.model_validate(data)
            results.extend(payload.result)

            pagination = payload.pagination
            if not pagination or not pagination.next_offset:
                break

            if pagination.next_offset <= offset:
                logger.warning(
                    "Invalid pagination detected (offset=%s, next=%s)",
                    offset,
                    pagination.next_offset,
                )
                break

            offset = pagination.next_offset

        logger.info("Fetched %d jobs from %s", len(results), path)
        return results

    # ----------------------------------------------------------------------
    # Public APIs
    # ----------------------------------------------------------------------

    async def get_jobs_by_type(
        self,
        scheduling_type: SchedulingType,
        limit: int = 200,
    ) -> List[SchedulingLineage]:
        return await self._fetch_paginated(
            path="/api/v1/jobs/scheduling-lineage/",
            params={
                "scheduling_type": scheduling_type.value,
                "limit": limit,
                "offset": 0,
            },
        )

    async def get_all_jobs(
        self,
        limit: Optional[int] = None,
    ) -> List[SchedulingLineage]:
        limit = limit or 200

        logger.info("Fetching all jobs from Job Manager")

        self_jobs = await self.get_jobs_by_type(
            SchedulingType.SELF_TYPE,
            limit,
        )
        req_jobs = await self.get_jobs_by_type(
            SchedulingType.REQUEST_TYPE,
            limit,
        )

        all_jobs = self_jobs + req_jobs
        logger.info("Total jobs fetched: %d", len(all_jobs))
        return all_jobs

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        try:
            return await self._request(
                "GET",
                f"/api/job/{job_id}",
            )
        except httpx.HTTPError:
            return None

    async def get_job_run_history(self, job_id: str) -> List[Dict[str, Any]]:
        return await self._request(
            "GET",
            "/api/job/job-run-history/",
            params={
                "job_id": job_id,
                "limit": 100,
                "offset": 0,
            },
        )

    async def fetch_lineages_by_ids(
        self,
        job_requests: List[Dict[str, str]],
    ) -> List[SchedulingLineage]:
        data = await self._request(
            "POST",
            "/api/v1/jobs/scheduling-lineage/by_ids",
            json={"jobs": job_requests},
        )

        payload = SchedulingLineageResponse.model_validate(data)
        return payload.result

    # ----------------------------------------------------------------------
    # Lifecycle
    # ----------------------------------------------------------------------

    async def close(self) -> None:
        await self.client.aclose()

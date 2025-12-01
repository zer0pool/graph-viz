import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from lineage_manager.core.config import get_settings
from lineage_manager.core.constants import SchedulingType
from lineage_manager.models.job_data_transformer import JobDataTransformer

logger = logging.getLogger(__name__)


class JobManagerPort(ABC):
    """Port interface for Job Manager external service."""

    @abstractmethod
    async def get_all_jobs(
        self,
        owner: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch all jobs from Job Manager API."""
        pass

    @abstractmethod
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific job from Job Manager API."""
        pass


class JobManagerAdapter(JobManagerPort):
    """Adapter for Job Manager API integration."""

    def __init__(self, base_url: Optional[str] = None):
        settings = get_settings()
        self.base_url = base_url or getattr(
            settings, "job_manager_url", "http://localhost:9000"
        )
        self.timeout = 60.0  # Increased timeout to handle slow responses

    async def get_all_jobs_paginated(
        self, scheduling_type: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Fetch all jobs of a specific scheduling type using pagination."""

        all_jobs = []
        offset = 0

        logger.info(
            f"Fetching {scheduling_type} jobs from Job Manager API with limit {limit}"
        )
        if offset > 0:
            logger.info(f"Starting from offset {offset} for testing purposes")

        logger.info(f"Starting pagination loop for {scheduling_type} jobs")
        try:
            while True:
                params = {
                    "scheduling_type": scheduling_type,
                    "offset": offset,
                    "limit": limit,
                }

                url = f"{self.base_url}/api/v1/jobs/scheduling-lineage/"
                logger.info(f"Fetching jobs from: {url}")
                logger.info(f"Request params: {params}")

                try:
                    logger.info(
                        f"Making request to {url} with params {params} and timeout {self.timeout}"
                    )
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.get(url, params=params)
                        logger.info(f"Response status: {response.status_code}")

                        response.raise_for_status()
                        data = response.json()
                        logger.info(f"Successfully parsed response JSON")

                        # Log response structure for debugging
                        logger.info(
                            f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}"
                        )

                        # Extract jobs from the result key
                        jobs = data.get("result", [])
                        all_jobs.extend(jobs)

                        logger.info(
                            f"Fetched {len(jobs)} {scheduling_type} jobs (offset: {offset})"
                        )

                        # Log if no jobs were fetched
                        if len(jobs) == 0:
                            logger.info(
                                f"@@@@@@  No jobs fetched at offset {offset}, checking pagination..."
                            )

                        # Check if there are more jobs to fetch
                        pagination = data.get("pagination", {})
                        next_offset = pagination.get("next_offset")

                        # Log pagination info for debugging
                        logger.info(
                            f"Pagination info - offset: {offset}, next_offset: {next_offset}, total jobs so far: {len(all_jobs)}"
                        )

                        # Log pagination structure for debugging
                        logger.info(f"Pagination structure: {pagination}")

                        # ##
                        if not next_offset:
                            logger.info(f"next_offset is None/null, terminating loop")
                            # Enhanced logging with job type information
                            total_jobs = len(all_jobs)

                            # Defensive logging to avoid exceptions
                            try:
                                logger.info(
                                    f"Finished fetching all {scheduling_type} jobs. "
                                    f"Total: {total_jobs}. "
                                )
                                logger.info(
                                    f"Termination condition met - next_offset is None/null"
                                )
                            except Exception as log_error:
                                logger.error(
                                    f"Error logging completion message: {log_error}"
                                )

                            break
                        elif next_offset <= offset:
                            logger.info(
                                f"next_offset ({next_offset}) <= current offset ({offset}), terminating loop"
                            )
                            # Enhanced logging with job type information
                            total_jobs = len(all_jobs)

                            # Defensive logging to avoid exceptions
                            try:
                                logger.info(
                                    f"Finished fetching all {scheduling_type} jobs. "
                                    f"Total: {total_jobs}. "
                                )
                                logger.info(
                                    f"Termination condition met - next_offset: {next_offset} <= current offset: {offset}"
                                )
                            except Exception as log_error:
                                logger.error(
                                    f"Error logging completion message: {log_error}"
                                )

                            break
                        else:
                            logger.info(
                                f"Continuing pagination - next_offset: {next_offset} > current offset: {offset}"
                            )

                        offset = next_offset

                        # Log before continuing to next iteration
                        logger.info(f"Setting offset to {offset} for next iteration")

                except httpx.HTTPError as e:
                    logger.error(
                        f"HTTP error fetching {scheduling_type} jobs from Job Manager: {e}"
                    )
                    if hasattr(e, "response") and e.response:
                        logger.error(f"Response status: {e.response.status_code}")
                        logger.error(f"Response text: {e.response.text}")
                    else:
                        logger.error("No response object available")
                    logger.info(f"Breaking loop due to HTTP error at offset {offset}")
                    break
                except Exception as e:
                    logger.error(
                        f"Unexpected error fetching {scheduling_type} jobs from Job Manager: {e}"
                    )
                    logger.exception("Full exception details:")
                    logger.info(
                        f"Breaking loop due to unexpected error at offset {offset}"
                    )
                    break

            logger.info(
                f"Exiting pagination loop for {scheduling_type} jobs, total jobs: {len(all_jobs)}"
            )
        except Exception as outer_e:
            logger.error(
                f"Unexpected error in pagination loop for {scheduling_type} jobs: {outer_e}"
            )
            logger.exception("Full exception details:")
            logger.info(f"Returning {len(all_jobs)} jobs due to outer exception")

        logger.info(f"Method returning {len(all_jobs)} jobs")
        if len(all_jobs) > 0:
            logger.info(
                f"First job ID: {all_jobs[0].get('job_id', 'N/A') if all_jobs else 'N/A'}"
            )
            logger.info(
                f"Last job ID: {all_jobs[-1].get('job_id', 'N/A') if all_jobs else 'N/A'}"
            )
        return all_jobs

    async def get_all_jobs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch all jobs from Job Manager API (both SELF-TYPE and REQ-TYPE)."""
        try:
            logger.info("Fetching all jobs from Job Manager API")

            # Fetch SELF-TYPE jobs
            self_type_jobs = await self.get_all_jobs_paginated(
                SchedulingType.SELF_TYPE.value,
                limit or 200,
            )
            logger.info(f"Fetched {len(self_type_jobs)} SELF-TYPE jobs")

            # Fetch REQ-TYPE jobs
            req_type_jobs = await self.get_all_jobs_paginated(
                SchedulingType.REQUEST_TYPE.value,
                limit or 200,
            )
            logger.info(f"Fetched {len(req_type_jobs)} REQ-TYPE jobs")

            # Combine both types
            all_jobs = self_type_jobs + req_type_jobs
            logger.info(f"Total jobs fetched: {len(all_jobs)}")

            return all_jobs
        except Exception as e:
            logger.error(f"Error fetching all jobs from Job Manager: {e}")
            logger.exception("Full exception details:")
            return []

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific job from Job Manager API."""
        try:
            url = f"{self.base_url}/api/job/{job_id}"
            logger.debug(f"Fetching job from: {url}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                logger.debug(f"Job response status: {response.status_code}")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching job {job_id} from Job Manager: {e}")
            if hasattr(e, "response") and e.response:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            else:
                logger.error("No response object available")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching job {job_id}: {e}")
            return None

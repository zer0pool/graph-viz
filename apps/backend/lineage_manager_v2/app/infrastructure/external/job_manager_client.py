import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class JobManagerClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.JOB_MANAGER_URL

    async def fetch_scheduling_lineage(
        self, batch_size: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Fetches all jobs and their lineage from the job manager with pagination.
        """
        all_items = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for s_type in ["SELF-TYPE", "REQUEST-TYPE"]:
                offset = 0
                while True:
                    try:
                        logger.info(
                            f"Fetching {s_type} lineage (offset={offset}, limit={batch_size})"
                        )
                        response = await client.get(
                            f"{self.base_url}/api/v1/jobs/scheduling-lineage/",
                            params={
                                "scheduling_type": s_type,
                                "limit": batch_size,
                                "offset": offset,
                            },
                        )
                        response.raise_for_status()
                        data = response.json()

                        # Handle response format
                        result_items = data.get("result", [])
                        if not isinstance(result_items, list):
                            logger.warning(
                                f"Unexpected response format for {s_type}: {result_items}"
                            )
                            break

                        all_items.extend(result_items)

                        # Check pagination
                        pagination = data.get("pagination", {})
                        next_offset = pagination.get("next_offset")

                        if not next_offset or next_offset <= offset:
                            logger.info(
                                f"Finished fetching {s_type} lineage. Total: {len(result_items)} in this pass."
                            )
                            break

                        offset = next_offset

                    except Exception as e:
                        logger.error(
                            f"Error fetching {s_type} lineage at offset {offset}: {e}"
                        )
                        break

        logger.info(f"Total jobs fetched from Job Manager: {len(all_items)}")
        return all_items

    async def get_job_run_history(self, job_id: str) -> List[Dict[str, Any]]:
        """Fetches run history for a specific job from the job manager."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{self.base_url}/job/{job_id}/run-history")
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, list) else []
            except Exception as e:
                logger.error(f"[JobManagerClient] Error fetching run history for {job_id}: {e}")
                return []

    async def pause_job(self, job_id: str) -> bool:
        """Calls external API to pause a job."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/jobs/{job_id}/pause"
                )
                response.raise_for_status()
                return True
            except Exception as e:
                print(f"Error pausing job {job_id}: {e}")
                return False

    async def resume_job(self, job_id: str) -> bool:
        """Calls external API to resume a job."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/jobs/{job_id}/resume"
                )
                response.raise_for_status()
                return True
            except Exception as e:
                print(f"Error resuming job {job_id}: {e}")
                return False

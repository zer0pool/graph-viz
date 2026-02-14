import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings


class JobManagerClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.JOB_MANAGER_URL

    async def fetch_scheduling_lineage(self) -> List[Dict[str, Any]]:
        """
        Fetches all jobs and their lineage from the dummy job manager.
        """
        # We'll fetch both SELF-TYPE and REQUEST-TYPE for a full initialization
        all_items = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for s_type in ["SELF-TYPE", "REQUEST-TYPE"]:
                try:
                    response = await client.get(
                        f"{self.base_url}/api/v1/jobs/scheduling-lineage/",
                        params={"scheduling_type": s_type, "limit": 1000},
                    )
                    response.raise_for_status()
                    data = response.json()
                    if data.get("status") == "success":
                        all_items.extend(data.get("result", []))
                except Exception as e:
                    print(f"Error fetching {s_type} lineage: {e}")

        return all_items

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

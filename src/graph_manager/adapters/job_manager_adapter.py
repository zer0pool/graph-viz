import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from graph_manager.core.config import get_settings

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
        self.timeout = 30.0

    async def get_all_jobs(
        self,
        owner: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch all jobs from Job Manager API."""
        try:
            params = {}
            if owner:
                params["owner"] = owner
            if limit:
                params["limit"] = limit
            if offset:
                params["offset"] = offset

            url = f"{self.base_url}/api/job"
            logger.info(f"Fetching jobs from: {url}")
            logger.debug(f"Request params: {params}")
            logger.info(f"Using job_manager_url: {self.base_url}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                logger.debug(f"Response status: {response.status_code}")
                logger.debug(f"Response headers: {dict(response.headers)}")

                response.raise_for_status()
                data = response.json()

                # Handle different response formats
                if isinstance(data, list):
                    jobs = data
                elif isinstance(data, dict):
                    jobs = data.get("jobs", data.get("data", []))
                else:
                    jobs = []

                logger.info(
                    f"Successfully fetched {len(jobs)} jobs from Job Manager API"
                )
                logger.debug(
                    f"Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Response is a list'}"
                )

                return jobs
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching jobs from Job Manager: {e}")
            if hasattr(e, "response") and e.response:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            else:
                logger.error("No response object available")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching jobs from Job Manager: {e}")
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


class JobDataTransformer:
    """Transforms Job Manager data to internal graph format."""

    @staticmethod
    def transform_job_to_graph_node(job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform job data from Job Manager to graph node format."""
        # Extract destination table info
        destinations = job_data.get("destinations", [])
        destination_table = None
        destination_type = None
        if destinations and len(destinations) > 0:
            dest = destinations[0]
            dest_type = dest.get("type", "")
            path = dest.get("path", "")
            table_name = dest.get("table_name", "")

            destination_type = dest_type
            if path and table_name:
                if dest_type == "mart":
                    # For mart type: path.table_name (e.g., sec-bdp-dev.sss_993_mart.codemirror_test_20251104_0830)
                    destination_table = f"{path}.{table_name}"
                elif dest_type == "external":
                    # For external type: path/table_name (e.g., s3://self-scheduling-exp-dev/test/ext_data_delivery_job)
                    destination_table = f"{path}/{table_name}"
                else:
                    # Default fallback
                    destination_table = f"{path}.{table_name}"

        # Extract schedule information
        schedule = job_data.get("schedule", {})
        schedule_cron = schedule.get("interval") if schedule else None

        # Extract trigger tables from the complex structure
        trigger_tables_raw = job_data.get("trigger_tables", [])
        trigger_tables = []
        for trigger in trigger_tables_raw:
            if isinstance(trigger, dict) and "table_id" in trigger:
                trigger_tables.append(trigger["table_id"])
            elif isinstance(trigger, str):
                trigger_tables.append(trigger)

        # Key attributes for the GraphJobNode
        key_fields = {
            "job_id": job_data.get("job_id"),
            "name": job_data.get("name", "Unknown Job"),  # Use name as the display name
            "owner": job_data.get("owner"),
            "labels": job_data.get("labels", {}),
            "write_mode": job_data.get("write_mode"),
            "destination_type": destination_type,
            "destination_table": destination_table,
            "trigger_tables": trigger_tables,
            "reference_tables": job_data.get("reference_tables", []),
        }

        # All other fields go to metadata
        metadata_fields = {
            "schedule": schedule,
            "schedule_cron": schedule_cron,
            "reference_service": job_data.get("reference_service"),
            "configurations": job_data.get("configurations"),
            "create_datetime": job_data.get("create_datetime"),
            "update_datetime": job_data.get("update_datetime"),
            "successful_dag_runs_count": job_data.get("successful_dag_runs_count"),
            "run_status": job_data.get("run_status"),
            "destinations": destinations,  # Keep full destinations for reference
            "trigger_tables_raw": trigger_tables_raw,  # Keep original trigger structure
        }

        return {
            **key_fields,
            "job_metadata": metadata_fields,
        }

    @staticmethod
    def transform_dependency_to_edge(dep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform dependency data from Job Manager to graph edge format."""
        return {
            "source_id": dep_data.get("source_job_id", dep_data.get("source")),
            "target_id": dep_data.get("target_job_id", dep_data.get("target")),
            "label": dep_data.get("dependency_type", "depends_on"),
        }

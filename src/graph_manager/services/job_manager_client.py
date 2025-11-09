from typing import Any, Dict, List, Optional

import httpx

from graph_manager.core.config import get_settings


class JobManagerClient:
    def __init__(self, base_url: Optional[str] = None):
        settings = get_settings()
        self.base_url = base_url or getattr(
            settings, "job_manager_url", "http://localhost:9000"
        )
        self.timeout = 30.0

    async def get_all_jobs(self) -> List[Dict[str, Any]]:
        """Fetch all jobs from Job Manager API."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/jobs")
                response.raise_for_status()
                data = response.json()
                return data.get("jobs", [])
        except httpx.HTTPError as e:
            print(f"Error fetching jobs from Job Manager: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error fetching jobs: {e}")
            return []

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific job from Job Manager API."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/jobs/{job_id}")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            print(f"Error fetching job {job_id} from Job Manager: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error fetching job {job_id}: {e}")
            return None

    async def get_job_dependencies(self) -> List[Dict[str, Any]]:
        """Fetch job dependencies from Job Manager API."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/jobs/dependencies")
                response.raise_for_status()
                data = response.json()
                return data.get("dependencies", [])
        except httpx.HTTPError as e:
            print(f"Error fetching job dependencies from Job Manager: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error fetching job dependencies: {e}")
            return []

    def transform_job_to_graph_node(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform job data from Job Manager to graph job node format."""
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
                    # For mart type: path.table_name
                    destination_table = f"{path}.{table_name}"
                elif dest_type == "external":
                    # For external type: path/table_name
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
        return {
            "job_id": job_data.get("job_id"),
            "name": job_data.get("name", "Unknown Job"),  # Use name as the display name
            "label": job_data.get("name", "Unknown Job"),
            "owner": job_data.get("owner"),
            "write_mode": job_data.get("write_mode"),
            "destination_type": destination_type,
            "destination_table": destination_table,
            "trigger_tables": trigger_tables,
            "reference_tables": job_data.get("reference_tables", []),
            "status": "pending" if job_data.get("run_status") == "STOP" else "active",
            "enabled": job_data.get("run_status") != "STOP",
            "job_metadata": {
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
            },
        }

    def transform_dependency_to_edge(self, dep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform dependency data from Job Manager to graph edge format."""
        return {
            "source_id": dep_data.get("source_job_id", dep_data.get("source")),
            "target_id": dep_data.get("target_job_id", dep_data.get("target")),
            "label": dep_data.get("dependency_type", "depends_on"),
        }

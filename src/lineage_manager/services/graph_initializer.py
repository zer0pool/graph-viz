import logging
from typing import Any, Dict, List

from lineage_manager.adapters.job_manager_adapter import JobManagerPort
from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)


class GraphInitializerService:
    """Service responsible for initializing the graph with data from Job Manager."""

    def __init__(self, job_manager: JobManagerPort, graph_service: GraphService):
        self.job_manager = job_manager
        self.graph_service = graph_service
        self.logger = logging.getLogger(__name__)

    async def initialize(self) -> Dict[str, Any]:
        """Initialize graph by fetching all jobs from Job Manager API."""
        try:
            self.logger.info("Starting graph initialization")

            # Clear existing graph data
            self.graph_service.reset_graph()

            # Fetch all jobs from Job Manager API
            jobs_data = await self._fetch_jobs()

            # Process each job
            result = await self._process_jobs(jobs_data)

            # Get final statistics
            stats = self.graph_service.get_health_stats()

            return self._build_result(result, stats)

        except Exception as e:
            self.logger.error(f"Graph initialization failed: {e}")
            self.logger.exception("Full traceback:")
            return self._build_error_result(str(e))

    async def _fetch_jobs(self) -> List[Dict[str, Any]]:
        """Fetch all jobs from Job Manager API."""
        self.logger.info("Fetching all jobs from Job Manager API")
        self.logger.debug(
            f"Job Manager base URL: {getattr(self.job_manager, 'base_url', 'unknown')}"
        )

        try:
            jobs_data = await self.job_manager.get_all_jobs()
            self.logger.info(f"Successfully fetched {len(jobs_data)} jobs from API")
            return jobs_data
        except Exception as api_error:
            self.logger.error(f"Failed to fetch jobs from Job Manager API: {api_error}")
            self.logger.exception("API call exception details:")
            raise

    async def _process_jobs(self, jobs_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """Process jobs and register them in the graph."""
        successful_registrations = 0
        failed_registrations = 0

        for job_data in jobs_data:
            try:
                # Transform job data to JobRegister schema
                job_register = self._transform_job_data(job_data)

                # Register the job using the existing method
                job_id = self.graph_service.register_job(job_register)
                self.logger.debug(f"Successfully registered job: {job_id}")
                successful_registrations += 1

            except Exception as e:
                self.logger.error(
                    f"Failed to register job {job_data.get('job_id', 'unknown')}: {e}"
                )
                failed_registrations += 1
                continue

        return {
            "successful_registrations": successful_registrations,
            "failed_registrations": failed_registrations,
            "jobs_fetched": len(jobs_data),
        }

    def _transform_job_data(self, job_data: Dict[str, Any]) -> JobRegister:
        """Transform job data from Job Manager API to JobRegister schema."""
        # Use the existing JobDataTransformer to get the transformed data
        transformed_data = JobDataTransformer.transform_job_to_graph_node(job_data)

        # Extract destination tables (handling the difference between the schemas)
        destination_tables = []
        if transformed_data.get("destination_table"):
            destination_tables = [transformed_data["destination_table"]]

        # Create JobRegister object with the available fields
        return JobRegister(
            job_id=transformed_data.get("job_id", ""),
            name=transformed_data.get("name", transformed_data.get("job_id", "")),
            trigger_tables=transformed_data.get("trigger_tables", []),
            reference_tables=transformed_data.get("reference_tables", []),
            destination_tables=destination_tables,
            metadata=transformed_data.get("job_metadata", {}),
        )

    def _build_result(
        self, process_result: Dict[str, int], stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build the final result dictionary."""
        return {
            "status": "success",
            "message": "Graph initialized successfully",
            "jobs_fetched": process_result["jobs_fetched"],
            "successful_registrations": process_result["successful_registrations"],
            "failed_registrations": process_result["failed_registrations"],
            "database_stats": (
                stats.get("database", {}) if stats.get("status") == "healthy" else {}
            ),
        }

    def _build_error_result(self, error_message: str) -> Dict[str, Any]:
        """Build an error result dictionary."""
        return {
            "status": "error",
            "message": f"Failed to initialize graph: {error_message}",
            "jobs_fetched": 0,
            "successful_registrations": 0,
            "failed_registrations": 0,
            "database_stats": {},
        }

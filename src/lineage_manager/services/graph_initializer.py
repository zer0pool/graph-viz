import logging
from typing import Any, Dict, List

from lineage_manager.adapters.job_manager_adapter import JobManagerPort
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService

logger = logging.getLogger(__name__)


class GraphInitializerService:
    """
    Orchestrator Service for initializing graph from Job Manager.
    
    ✅ TRANSACTION POLICY:
    - This service OWNS transactions.
    - Uses `with uow.transactional():` for each job (partial success).
    - Delegates mutations to GraphCommandService.
    """

    def __init__(
        self,
        job_manager: JobManagerPort,
        command_service: GraphCommandService,
        query_service: GraphQueryService,
    ):
        self.job_manager = job_manager
        self.command_service = command_service
        self.query_service = query_service
        self.logger = logging.getLogger(__name__)

    async def initialize(self) -> Dict[str, Any]:
        """Initialize graph with partial success support."""
        try:
            self.logger.info("Starting graph initialization")

            # Step 1: Clear existing graph (single transaction)
            with self.command_service.uow.transactional():
                self.command_service.reset_graph()

            # Step 2: Fetch jobs
            jobs_data = await self._fetch_jobs()

            # Step 3: Register jobs with partial success
            result = await self._process_jobs_with_partial_success(jobs_data)

            # Step 4: Get final statistics
            stats = self.query_service.get_health_stats()

            return self._build_result(result, stats)

        except Exception as e:
            self.logger.error(f"Graph initialization failed: {e}")
            self.logger.exception("Full traceback:")
            return self._build_error_result(str(e))

    async def _fetch_jobs(self) -> List[SchedulingLineage]:
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

    async def _process_jobs_with_partial_success(
        self, jobs_data: List[SchedulingLineage]
    ) -> Dict[str, int]:
        """Process jobs with individual transactions (partial success)."""
        successful = 0
        failed = 0

        for job_data in jobs_data:
            try:
                # Each job gets its own transaction
                with self.command_service.uow.transactional():
                    job_id = self.command_service.register_lineage_job(job_data)
                    self.logger.debug(f"Successfully registered job: {job_id}")
                    successful += 1

            except Exception as e:
                self.logger.error(
                    f"Failed to register job {getattr(job_data, 'job_id', 'unknown')}: {e}"
                )
                failed += 1
                continue

        return {
            "successful_registrations": successful,
            "failed_registrations": failed,
            "jobs_fetched": len(jobs_data),
        }

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

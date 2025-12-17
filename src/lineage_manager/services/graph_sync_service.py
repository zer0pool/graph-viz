import logging
from typing import Any, Dict, List, Optional

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_initializer import GraphInitializerService

logger = logging.getLogger(__name__)


class GraphSyncService:
    """
    Orchestrator Service for syncing jobs from Job Manager.
    
    ✅ TRANSACTION POLICY:
    - This service OWNS transactions.
    - Uses `with self.uow.transactional():` to manage commits.
    - Delegates mutations to GraphCommandService.
    - Supports partial success (individual transactions per job).
    """
    
    _last_sync_result: Dict[str, Any] | None = None

    def __init__(
        self,
        uow: GraphUnitOfWork,
        job_manager: JobManagerAdapter,
        command_service: GraphCommandService,
        query_service: GraphQueryService,
        initializer_service: GraphInitializerService
    ):
        self.uow = uow
        self.job_manager = job_manager
        self.command_service = command_service
        self.query_service = query_service
        self.initializer_service = initializer_service

    # ========================================================================
    # Sync from Manager Methods
    # ========================================================================

    async def sync_job_from_manager(self, job_id: str) -> Dict[str, Any]:
        """Fetch a single job from Manager and register it to Graph."""
        try:
            jd = await self.job_manager.get_job(job_id)
            if not jd:
                return {
                    "status": "error",
                    "message": f"Job '{job_id}' not found in manager",
                }

            # Use the JobDataTransformer to transform the job data
            transformed_data = JobDataTransformer.transform_job_to_graph_node(jd)

            # Extract destination tables from transformed data
            destination_tables = transformed_data.get("destination_tables", [])
            # destination_type is singular in source job dict but plural in schema
            dt = jd.get("destination_type")
            destination_types = [dt] if dt else []

            jr = JobRegister(
                job_id=jd.get("job_id", job_id),
                name=jd.get("name", job_id),
                labels=jd.get("labels", {}),
                owner=jd.get("owner"),
                write_mode=jd.get("write_mode"),
                destination_types=destination_types,
                destination_tables=destination_tables,
                trigger_tables=transformed_data.get("trigger_tables", []),
                reference_tables=transformed_data.get("reference_tables", []),
                run_status=jd.get("run_status", "RUN"),
                schedule=jd.get("schedule"),
                destinations=jd.get("destinations"),
                metadata=transformed_data.get("job_metadata", {}),
            )
            # Delegate to CommandService
            self.command_service.register_job(jr)
            return {"status": "success", "job_id": job_id}
        except Exception as e:
            logger.error(f"sync_job_from_manager failed: {e}")
            return {"status": "error", "message": str(e)}

    async def sync_node(self, node_type: str, node_db_id: int) -> Dict[str, Any]:
        """Sync a node (job or table) by re-fetching from Manager."""
        uow = self.uow
        if node_type == "job":
            job = uow.jobs.get_by_id(node_db_id)
            if not job:
                return {"status": "error", "message": f"job id={node_db_id} not found"}
            return await self.sync_job_from_manager(job.job_id)
        else:
            table = uow.tables.get_by_id(node_db_id)
            if not table:
                return {
                    "status": "error",
                    "message": f"table id={node_db_id} not found",
                }
            producers = uow.job_table_links.get_jobs_by_table_and_io_type(
                table.id, "output"
            )
            ok, fail = 0, 0
            for j in producers:
                res = await self.sync_job_from_manager(j.job_id)
                if res.get("status") == "success":
                    ok += 1
                else:
                    fail += 1
            return {
                "status": "success",
                "synced": ok,
                "failed": fail,
                "table": table.full_name,
            }

    def sync_from_payload(
        self, jobs: List[JobRegister], reset: bool = False
    ) -> Dict[str, Any]:
        """Sync graph from a list of JobRegister payloads."""
        if reset:
            self.command_service.reset_graph()

        success = 0
        errors: List[str] = []
        for j in jobs:
            try:
                self.command_service.register_job(j)
                success += 1
            except Exception as e:
                errors.append(f"{j.job_id}: {e}")

        stats = self.query_service.get_health_stats()
        result: Dict[str, Any] = {
            "status": "success" if not errors else "partial",
            "synced_jobs": success,
            "errors": errors,
            "database_stats": stats.get("database") if isinstance(stats, dict) else {},
        }
        GraphSyncService._last_sync_result = result
        # Invalidate cache after bulk sync
        self.query_service.invalidate_graph_snapshot()
        return result

    async def sync_from_job_manager(self, reset: bool = False) -> Dict[str, Any]:
        """Sync graph by fetching all jobs from Job Manager."""
        if reset:
            self.command_service.reset_graph()
        result = await self.initializer_service.initialize()
        GraphSyncService._last_sync_result = result
        # Invalidate cache after full sync
        self.query_service.invalidate_graph_snapshot()
        return result

    @classmethod
    def last_sync_status(cls) -> Dict[str, Any] | None:
        """Get the last sync result."""
        return getattr(cls, "_last_sync_result", None)

    # ========================================================================
    # Direct Lineage Sync Methods
    # ========================================================================

    def sync_single_job(
        self,
        lineage: SchedulingLineage,
        dry_run: bool = False
    ) -> dict:
        """Sync a single job lineage with transaction management."""
        if dry_run:
            changes = self.command_service.preview_lineage_job(lineage)
            return {
                "status": "dry_run",
                "job_id": lineage.job_id,
                "changes": changes
            }
        
        # Orchestrator owns transaction
        with self.uow.transactional():
            self.sync_from_lineage(lineage)
            # Invalidate cache after single job sync
            self.query_service.invalidate_graph_snapshot()
            return {
                "status": "success",
                "job_id": lineage.job_id,
                "message": f"Job {lineage.job_id} synced successfully"
            }

    async def sync_multiple_jobs(
        self,
        job_requests: List[Dict[str, str]],
        dry_run: bool = False
    ) -> dict:
        """Sync multiple jobs with partial success support."""
        lineages = await self.job_manager.fetch_lineages_by_ids(job_requests)
        
        if dry_run:
            results = []
            for lineage in lineages:
                changes = self.command_service.preview_lineage_job(lineage)
                results.append({
                    "job_id": lineage.job_id,
                    "changes": changes
                })
            
            return {
                "status": "dry_run",
                "total_jobs": len(results),
                "results": results
            }
        
        # Partial success: each job gets its own transaction
        results = []
        for lineage in lineages:
            try:
                with self.uow.transactional():  # Individual transaction per job
                    self.command_service.register_lineage_job(lineage)
                    results.append({
                        "job_id": lineage.job_id,
                        "status": "success"
                    })
            except Exception as e:
                logger.error(f"Failed to sync job {lineage.job_id}: {e}")
                results.append({
                    "job_id": lineage.job_id,
                    "status": "error",
                    "message": str(e)
                })
        
        success_count = sum(1 for r in results if r["status"] == "success")

        if success_count > 0:
            self.query_service.invalidate_graph_snapshot()
            
        return {
            "status": "completed",
            "total": len(results),
            "successful": success_count,
            "failed": len(results) - success_count,
            "results": results
        }

    def sync_from_lineage(self, lineage: SchedulingLineage) -> None:
        """Sync a single SchedulingLineage to the graph."""
        # This was duplicating logic. Now delegating to CommandService.
        self.command_service.register_lineage_job(lineage)



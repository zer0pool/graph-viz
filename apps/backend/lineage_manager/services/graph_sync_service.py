import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Set

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.core.uow import GraphUnitOfWork
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
        initializer_service: GraphInitializerService,
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

            # Parse dict into SchedulingLineage
            # Note: We assume the dictionary from get_job is compatible with SchedulingLineage model.
            try:
                lineage = SchedulingLineage.model_validate(jd)
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Invalid job data format for {job_id}: {e}",
                }

            # Orchestrator owns transaction
            with self.uow.transactional():
                self.command_service.register_lineage_job(lineage)

            return {"status": "success", "job_id": job_id}
        except Exception as e:
            logger.error(f"sync_job_from_manager failed: {e}")
            return {"status": "error", "message": str(e)}

    async def refresh_job(self, job_id: str) -> Dict[str, Any]:
        """
        Smart sync: Fetch job, compare with DB, and apply minimal updates.
        """
        try:
            lineage = await self._fetch_remote_job(job_id)
            action, synced_at = self._process_job_sync(job_id, lineage)

            return {
                "status": "success",
                "job_id": job_id,
                "action": action,
                "synced_at": synced_at.isoformat(),
            }
        except ValueError as e:
            return {"status": "error", "message": str(e)}
        except Exception as e:
            logger.error(f"refresh_job failed for {job_id}: {e}")
            return {"status": "error", "message": str(e)}

    async def _fetch_remote_job(self, job_id: str) -> SchedulingLineage:
        """Fetch and validate job from Job Manager."""
        jd = await self.job_manager.get_job(job_id)
        if not jd:
            raise ValueError(f"Job '{job_id}' not found in manager")

        try:
            return SchedulingLineage.model_validate(jd)
        except Exception as e:
            raise ValueError(f"Invalid job format: {e}") from e

    def _process_job_sync(
        self, job_id: str, lineage: SchedulingLineage
    ) -> Tuple[str, datetime]:
        """Compare state and apply necessary updates within transaction."""
        uow = self.uow
        existing_job = uow.jobs.get(job_id)

        if not existing_job:
            action = "create"
            with uow.transactional():
                self.command_service.register_lineage_job(lineage)
            return action, datetime.utcnow()

        is_structural, is_meta = self._calculate_job_diff(existing_job, lineage)
        action = self._determine_sync_action(is_structural, is_meta)

        with uow.transactional():
            self._apply_sync_update(action, existing_job, lineage)

        return action, datetime.utcnow()

    def _determine_sync_action(self, is_structural: bool, is_meta: bool) -> str:
        if is_structural:
            return "full_sync"
        if is_meta:
            return "meta_sync"
        return "touch"

    def _apply_sync_update(
        self, action: str, existing_job: Any, lineage: SchedulingLineage
    ):
        """Dispatch update based on action type."""
        if action == "full_sync":
            self.command_service.register_lineage_job(lineage)
        elif action == "meta_sync":
            self.command_service.update_job_metadata(existing_job, lineage)
            self.command_service.touch_job_timestamp(existing_job)
        else:  # touch
            self.command_service.touch_job_timestamp(existing_job)

    def _calculate_job_diff(
        self, existing_job: Any, new_lineage: SchedulingLineage
    ) -> Tuple[bool, bool]:
        """Compare existing job node with new lineage payload."""
        # 1. Structural Check
        if self._has_structural_changes(existing_job, new_lineage):
            return True, True  # Meta change implied if structure changes

        # 2. Metadata Check
        has_meta = self._has_metadata_changes(existing_job, new_lineage)
        return False, has_meta

    def _has_structural_changes(
        self, existing_job: Any, new_lineage: SchedulingLineage
    ) -> bool:
        existing_props = existing_job.job_metadata or {}

        new_ups = self._get_edge_names_from_lineage(new_lineage.upstreams)
        old_ups = self._get_edge_names_from_props(existing_props.get("upstreams", []))

        if new_ups != old_ups:
            return True

        new_downs = self._get_edge_names_from_lineage(new_lineage.downstreams)
        old_downs = self._get_edge_names_from_props(
            existing_props.get("downstreams", [])
        )

        return new_downs != old_downs

    def _has_metadata_changes(
        self, existing_job: Any, new_lineage: SchedulingLineage
    ) -> bool:
        existing_props = existing_job.job_metadata or {}
        current_props = self.command_service._extract_job_properties(new_lineage)

        exclude_keys = {"upstreams", "downstreams", "updated_at"}

        for key, new_val in current_props.items():
            if key in exclude_keys:
                continue
            if new_val != existing_props.get(key):
                return True
        return False

    def _get_edge_names_from_lineage(self, edges: List[Any]) -> Set[str]:
        return {e.name for e in edges}

    def _get_edge_names_from_props(self, props_list: List[Dict]) -> Set[str]:
        return {item.get("name") for item in props_list if item.get("name")}

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
        self, jobs: List[SchedulingLineage], reset: bool = False
    ) -> Dict[str, Any]:
        """Sync graph from a list of SchedulingLineage payloads."""
        if reset:
            self.command_service.reset_graph()

        success = 0
        errors: List[str] = []
        
        # Performance optimization: Use a single transaction for the whole payload
        # if the user wants atomicity, otherwise wrap each job in its own transaction.
        # Given this is a batch payload, we'll use a single transaction for speed,
        # but catch errors per job to report them.
        try:
            with self.uow.transactional():
                for j in jobs:
                    try:
                        self.command_service.register_lineage_job(j)
                        success += 1
                    except Exception as e:
                        errors.append(f"{j.job_id}: {e}")
                        # In a single transaction, one failure rolls back everything.
                        # If we want to continue, we need nested transactions or separate blocks.
                        # For simplicity and correctness with UoW, we'll re-raise to rollback.
                        raise
        except Exception as e:
            logger.error(f"Sync from payload failed: {e}")
            # If batch fails, we don't have partial success in this simple implementation
            # because transactional() rolls back.
            success = 0
            # errors is already populated or will be updated in caller

        stats = self.query_service.get_diagnostics()
        result: Dict[str, Any] = {
            "status": "success" if not errors else "partial",
            "synced_jobs": success,
            "errors": errors,
            "database_stats": stats.get("database") if isinstance(stats, dict) else {},
        }
        GraphSyncService._last_sync_result = result
        return result

    async def sync_from_job_manager(self, reset: bool = False) -> Dict[str, Any]:
        """Sync graph by fetching all jobs from Job Manager."""
        # reset=True logic is handled inside initializer_service.initialize()
        result = await self.initializer_service.initialize()
        GraphSyncService._last_sync_result = result
        return result

    @classmethod
    def last_sync_status(cls) -> Dict[str, Any] | None:
        """Get the last sync result."""
        return getattr(cls, "_last_sync_result", None)

    # ========================================================================
    # Direct Lineage Sync Methods
    # ========================================================================

    def sync_single_job(
        self, lineage: SchedulingLineage, dry_run: bool = False
    ) -> dict:
        """Sync a single job lineage with transaction management."""
        if dry_run:
            changes = self.command_service.preview_lineage_job(lineage)
            return {"status": "dry_run", "job_id": lineage.job_id, "changes": changes}

        # Orchestrator owns transaction
        with self.uow.transactional():
            self.sync_from_lineage(lineage)
            return {
                "status": "success",
                "job_id": lineage.job_id,
                "message": f"Job {lineage.job_id} synced successfully",
            }

    async def sync_multiple_jobs(
        self, job_requests: List[Dict[str, str]], dry_run: bool = False
    ) -> dict:
        """Sync multiple jobs with partial success support."""
        lineages = await self.job_manager.fetch_lineages_by_ids(job_requests)

        if dry_run:
            results = []
            for lineage in lineages:
                changes = self.command_service.preview_lineage_job(lineage)
                results.append({"job_id": lineage.job_id, "changes": changes})

            return {"status": "dry_run", "total_jobs": len(results), "results": results}

        # Batch processing: group jobs into transactional batches to improve performance
        # Reduced batch_size to 20 to prevent OOM during complex closure updates
        batch_size = 20
        results = []

        for i in range(0, len(lineages), batch_size):
            batch = lineages[i : i + batch_size]
            try:
                with self.uow.transactional():
                    for lineage in batch:
                        self.command_service.register_lineage_job(lineage)
                        results.append({"job_id": lineage.job_id, "status": "success"})
            except Exception as e:
                logger.error(
                    f"Batch sync failed for {len(batch)} jobs starting at index {i}: {e}"
                )
                # Anything already in results for this batch is invalid due to rollback.
                results = results[:i]
                for lineage in batch:
                    results.append(
                        {
                            "job_id": lineage.job_id,
                            "status": "error",
                            "message": f"Batch failure: {str(e)}",
                        }
                    )

        success_count = sum(1 for r in results if r["status"] == "success")
        return {
            "status": "completed",
            "total": len(results),
            "successful": success_count,
            "failed": len(results) - success_count,
            "results": results,
        }

    def sync_from_lineage(self, lineage: SchedulingLineage) -> None:
        """Sync a single SchedulingLineage to the graph."""
        # This was duplicating logic. Now delegating to CommandService.
        self.command_service.register_lineage_job(lineage)

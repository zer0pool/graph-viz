from typing import Any, Dict, List

from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_service import GraphService


class GraphBuildService:
    """Write-oriented facade delegating to GraphService (build/sync/reset)."""

    def __init__(self, core: GraphService):
        self.core = core
        # class-level store for last sync status (non-persistent)
        # Providers.Factory creates a new instance per request, so use class var
        # to expose the last result across requests within the process lifetime.
        if not hasattr(GraphBuildService, "_last_sync_result"):
            GraphBuildService._last_sync_result: Dict[str, Any] | None = None

    def register_job(self, payload: JobRegister) -> str:
        return self.core.register_job(payload)

    def register_lineage_job(self, payload: SchedulingLineage) -> str:
        return self.core.register_lineage_job(payload)

    def reset_graph(self):
        return self.core.reset_graph()

    async def initialize_graph(self):
        return await self.core.initialize_graph()

    # --------- Sync helpers ---------
    def sync_from_payload(
        self, jobs: List[JobRegister], reset: bool = False
    ) -> Dict[str, Any]:
        if reset:
            self.core.reset_graph()

        success = 0
        errors: List[str] = []
        for j in jobs:
            try:
                self.core.register_job(j)
                success += 1
            except Exception as e:  # pragma: no cover
                errors.append(f"{j.job_id}: {e}")

        stats = self.core.get_health_stats()
        result: Dict[str, Any] = {
            "status": "success" if not errors else "partial",
            "synced_jobs": success,
            "errors": errors,
            "database_stats": stats.get("database") if isinstance(stats, dict) else {},
        }
        GraphBuildService._last_sync_result = result
        return result

    async def sync_from_job_manager(self, reset: bool = False) -> Dict[str, Any]:
        if reset:
            self.core.reset_graph()
        result = await self.core.initialize_graph()
        # store last
        GraphBuildService._last_sync_result = result
        return result

    @classmethod
    def last_sync_status(cls) -> Dict[str, Any] | None:
        return getattr(cls, "_last_sync_result", None)

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from lineage_manager.adapters.job_manager_adapter import JobManagerPort


from lineage_manager.core.uow import GraphUnitOfWork


class JobService:
    """Service layer for job-related business logic."""

    def __init__(self, job_manager: JobManagerPort, graph_uow: GraphUnitOfWork = None):
        self.job_manager = job_manager
        self.graph_uow = graph_uow

    def _parse_iso_datetime(self, ts: Optional[str]) -> Optional[datetime]:
        """Helper to parse ISO timestamp safely."""
        if not ts:
            return None
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return None

    def _map_job_to_dto(
        self, node: Any, meta: Any, project_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convert internal job node structures to API DTO format."""
        properties = meta.properties or {}
        return {
            "job_id": node.name,
            "node_id": node.id,
            "running_status": properties.get("status", "unknown"),
            "owners": meta.owners or [],
            "project_id": meta.project_id,
            "project_name": project_name or meta.project_id,
            "job_name": properties.get("display_name", node.name),
            "enabled": properties.get("enabled", True),
            "updated_at": meta.updated_at.isoformat() if meta.updated_at else None,
        }

    async def get_run_history(self, job_id: str) -> Dict[str, Any]:
        """Fetch run history via adapter and map to UI schema."""
        try:
            upstream_runs = await self.job_manager.get_job_run_history(job_id)
        except Exception as exc:
            raise HTTPException(
                status_code=502, detail=f"Job Manager error: {exc}"
            ) from exc

        status_map = {
            "running": "running",
            "success": "success",
            "failed": "failed",
            "queued": "queued",
        }

        timeline: List[Dict[str, Any]] = []
        for item in upstream_runs or []:
            dag_run_id = item.get("dag_run_id")
            state = (item.get("state") or "").lower()
            start = self._parse_iso_datetime(item.get("start_time"))
            end = self._parse_iso_datetime(item.get("finish_time"))
            duration = int((end - start).total_seconds()) if start and end else None
            triggered_by = (
                dag_run_id.split("__", 1)[0]
                if dag_run_id and "__" in dag_run_id
                else None
            )

            timeline.append(
                {
                    "run_id": dag_run_id,
                    "status": status_map.get(state, state or "unknown"),
                    "start_time": item.get("start_time"),
                    "end_time": item.get("finish_time"),
                    "duration_sec": duration,
                    "triggered_by": triggered_by,
                }
            )

        # Calculate summary statistics
        summary = {
            "total": len(timeline),
            "running": sum(
                1 for r in timeline if r["status"] in ("running", "queued", "pending")
            ),
            "success": sum(1 for r in timeline if r["status"] == "success"),
            "failed": sum(1 for r in timeline if r["status"] == "failed"),
        }

        return {
            "status": "success",
            "input": {"job_id": job_id},
            "result": {
                "timeline": timeline,
                "summary": summary,
            },
        }

    def list_jobs(self, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        List all jobs, sorted by recently updated.

        Returns:
            Dictionary containing list of jobs and pagination info.
        """
        if not self.graph_uow:
            return {"jobs": [], "total": 0, "limit": limit, "offset": offset}

        results, total = self.graph_uow.job_node.list_all_jobs(
            limit=limit, offset=offset
        )

        jobs = [
            self._map_job_to_dto(node, meta, project_name)
            for node, meta, project_name in results
        ]

        return {"jobs": jobs, "total": total, "limit": limit, "offset": offset}

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from lineage_manager.adapters.job_manager_adapter import JobManagerPort


class JobService:
    """Service layer for job-related business logic."""

    def __init__(self, job_manager: JobManagerPort):
        self.job_manager = job_manager

    async def get_run_history(self, job_id: str) -> Dict[str, Any]:
        """Fetch run history via adapter and map to UI schema."""
        try:
            upstream_runs = await self.job_manager.get_job_run_history(job_id)
        except Exception as exc:  # Adapter already logs; map to HTTP 502
            raise HTTPException(status_code=502, detail=f"Job Manager error: {exc}") from exc

        def parse_iso(ts: Optional[str]) -> Optional[datetime]:
            if not ts:
                return None
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                return None

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
            start = parse_iso(item.get("start_time"))
            end = parse_iso(item.get("finish_time"))
            duration = int((end - start).total_seconds()) if start and end else None
            triggered_by = dag_run_id.split("__", 1)[0] if dag_run_id and "__" in dag_run_id else None

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

        return {
            "status": "success",
            "input": {"job_id": job_id},
            "result": {"timeline": timeline},
        }


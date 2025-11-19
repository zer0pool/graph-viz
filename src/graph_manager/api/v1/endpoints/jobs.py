"""Jobs endpoints."""

from typing import List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from graph_manager.core.auth import is_auth_enabled, require_authenticated_user
from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_service import GraphService


AUTH_DEPS = [Depends(require_authenticated_user)] if is_auth_enabled() else []

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Jobs"],
    dependencies=AUTH_DEPS,
)


@router.get("/{job_id}")
@inject
def get_job_detail(
    job_id: str,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    job = graph_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return {
        "job_id": job.job_id,
        "name": job.name,
        "labels": job.labels,
        "status": getattr(job, "status", None),
        "enabled": getattr(job, "enabled", None),
        "owner": job.owner,
        "write_mode": job.write_mode,
        "destination_type": job.destination_type,
        "destination_table": job.destination_table,
        "trigger_tables": job.trigger_tables,
        "reference_tables": job.reference_tables,
        "metadata": job.job_metadata,
    }


@router.get("/{job_id}/graph")
@inject
def get_job_graph(
    job_id: str,
    depth: int = 1,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    deps = graph_service.get_job_dependencies(job_id, max_depth=depth)
    if deps.get("status") == "error":
        raise HTTPException(status_code=500, detail=deps["message"])
    return {"job_id": job_id, "dependencies": deps, "depth": depth}


class JobUpdateRequest(BaseModel):
    status: Optional[str] = None
    enabled: Optional[bool] = None
    trigger_tables: Optional[List[str]] = None


@router.patch("/{job_id}")
@inject
def update_job(
    job_id: str,
    payload: JobUpdateRequest,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    job = graph_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    updates: dict = {}
    meta = dict(getattr(job, "job_metadata", {}) or {})

    if payload.status is not None:
        if payload.status not in ["pending", "success", "failure", "disabled"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        meta["status"] = payload.status
        updates["status"] = payload.status

    if payload.enabled is not None:
        meta["enabled"] = bool(payload.enabled)
        updates["enabled"] = bool(payload.enabled)

    if payload.trigger_tables is not None:
        job.trigger_tables = payload.trigger_tables
        updates["trigger_tables"] = payload.trigger_tables

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if "status" in updates or "enabled" in updates:
        job.job_metadata = meta

    try:
        graph_service.uow.commit()
    except Exception:
        graph_service.uow.rollback()
        raise

    return {"job_id": job_id, "updated": updates, "message": f"Job '{job_id}' updated successfully."}


@router.post("/{job_id}/actions/toggle")
@inject
def toggle_job_status(
    job_id: str,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    job = graph_service.toggle_job_enabled(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    try:
        graph_service.uow.commit()
    except Exception:
        graph_service.uow.rollback()
        raise

    return {
        "job_id": job_id,
        "enabled": getattr(job, "enabled", None),
        "status": getattr(job, "status", None),
        "message": f"Job '{job_id}' is now {'enabled' if getattr(job, 'enabled', False) else 'disabled'}.",
    }

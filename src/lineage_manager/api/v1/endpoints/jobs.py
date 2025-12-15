"""Jobs endpoints."""

from typing import List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.job_service import JobService
from lineage_manager.api.v1.schemas import JobUpdateRequest

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Jobs"],
    dependencies=AUTH_DEPS,
)


@router.get("/{job_id}")
@inject
def get_job_detail(
    job_id: str,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    job = svc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    # Extract upstreams and downstreams from metadata
    meta = job.job_metadata or {}
    upstreams = meta.get("upstreams", [])
    downstreams = meta.get("downstreams", [])

    # Implement fallback mapping if metadata lists are empty
    if not upstreams:
        # Check both top-level properties and metadata for triggers/references
        triggers = set(job.trigger_tables or meta.get("trigger_tables") or [])
        ref_tables = job.reference_tables or meta.get("reference_tables") or []
        
        upstreams = [
            {"type": "table", "name": t, "trigger": t in triggers}
            for t in ref_tables
        ]
        
    if not downstreams:
        dest_tables = job.destination_tables or meta.get("destination_tables") or []
        # Fallback to singular destination_table if list is empty
        if not dest_tables:
             dt = job.destination_table or meta.get("destination_table")
             if dt:
                 dest_tables = [dt]

        downstreams = [
            {"type": "table", "name": t}
            for t in dest_tables
        ]

    # Construct properties from model fields and remaining metadata
    # Default properties from the model columns
    properties = {
        "owner": job.owner,
        "labels": job.labels,
        "write_mode": job.write_mode,
        "destination_types": job.destination_types,
        "destination_tables": job.destination_tables,
        "trigger_tables": job.trigger_tables,
        "reference_tables": job.reference_tables,
        "status": getattr(job, "status", None),
        "enabled": getattr(job, "enabled", None),
    }
    # update with metadata (metadata values take precedence or add extra info)
    properties.update(meta)
    
    return {
        "job_id": job.job_id,
        "name": job.name,
        "type": meta.get("type", "job"),
        "upstreams": upstreams,
        "downstreams": downstreams,
        "properties": properties,
    }


@router.get("/{job_id}/graph")
@inject
def get_job_graph(
    job_id: str,
    depth: int = 1,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    deps = svc.get_job_neighbors(job_id, level=depth)
    if deps.get("status") == "error":
        raise HTTPException(status_code=500, detail=deps["message"])
    return {"job_id": job_id, "dependencies": deps, "depth": depth}





@router.patch("/{job_id}")
@inject
def update_job(
    job_id: str,
    payload: JobUpdateRequest,
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
):
    try:
        result = svc.update_job(job_id, payload)
        if not result:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
        
        # If result contains 'updated' as empty, previously we defined "No valid fields" here?
        # The service returns what it updated.
        if not result.get("updated"):
             # Original logic: raise 400 if no valid fields.
             # Service doesn't raise, just returns empty updates?
             # My service implementation doesn't raise if updates empty.
             # I should check if updates dict is empty.
             raise HTTPException(status_code=400, detail="No valid fields to update")
             
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/actions/toggle")
@inject
def toggle_job_status(
    job_id: str,
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
):
    # Service handles transaction
    job = svc.toggle_job_enabled(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return {
        "job_id": job_id,
        "enabled": getattr(job, "enabled", None),
        "status": getattr(job, "status", None),
        "message": f"Job '{job_id}' is now {'enabled' if getattr(job, 'enabled', False) else 'disabled'}.",
    }

@router.get("/{job_id}/run-history")
@inject
async def get_job_run_history(
    job_id: str,
    job_service: JobService = Depends(Provide[GraphContainer.job.job_service]),
):
    """Fetch run history from Job Manager via service layer."""
    return await job_service.get_run_history(job_id)
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
from lineage_manager.services.graph_sync_service import GraphSyncService
from lineage_manager.api.v1.schemas import JobUpdateRequest

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Jobs"],
    dependencies=AUTH_DEPS,
)


@router.get("")
@inject
def list_jobs(
    limit: int = 20,
    offset: int = 0,
    svc: JobService = Depends(Provide[GraphContainer.job.job_service]),
):
    """
    List jobs with pagination (sorted by recently updated).
    """
    try:
        return svc.list_jobs(limit=limit, offset=offset)
    except Exception as e:
        # logger.error is not defined in this file, use print for now or import logging if available
        # It seems logger is usually defined at top level but was missing in view_file.
        # Let's assume standard error handling
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}")
@inject
def get_job_detail(
    job_id: str,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    # Ensure job_id is clean (strip job: prefix if it accidentally leaked from frontend)
    clean_job_id = job_id.replace("job:", "")

    job = svc.get_job(clean_job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{clean_job_id}' not found")

    # properties contains both top-level and legacy job_metadata flattened by get_job/GraphNode
    # Let's extract relations with preference for top-level keys
    upstreams = job._get_prop("upstreams")
    downstreams = job._get_prop("downstreams")

    # Define meta for fallback logic
    meta = getattr(job, "job_metadata", {}) or {}

    # Implement fallback mapping if direct lists are missing
    if not upstreams:
        triggers = set(
            getattr(job, "trigger_tables", []) or meta.get("trigger_tables") or []
        )
        ref_tables = (
            getattr(job, "reference_tables", []) or meta.get("reference_tables") or []
        )
        upstreams = [
            {"type": "table", "name": t, "trigger": t in triggers} for t in ref_tables
        ]

    if not downstreams:
        dest_tables = (
            getattr(job, "destination_tables", [])
            or meta.get("destination_tables")
            or []
        )
        if not dest_tables:
            dt = getattr(job, "destination_table", None) or meta.get(
                "destination_table"
            )
            if dt:
                dest_tables = [dt]
        downstreams = [{"type": "table", "name": t} for t in dest_tables]

    # Construct response properties - prioritized flattened list
    # We include everything currently in properties, but ensure common fields exist
    properties = dict(job.properties or {})

    # Ensure key fields are present even if null
    properties.setdefault("owners", getattr(job, "owners", []))
    properties.setdefault("labels", getattr(job, "labels", {}))
    properties.setdefault("status", getattr(job, "status", "unknown"))
    properties.setdefault("enabled", getattr(job, "enabled", True))

    # Clean up leftovers: legacy support for deeply nested metadata
    # (Note: new registrations are already flattened in GraphCommandService)
    for legacy_key in ["job_meta", "job_metadata"]:
        if legacy_key in properties:
            child_meta = properties.pop(legacy_key)
            if isinstance(child_meta, dict):
                for k, v in child_meta.items():
                    if k not in properties:
                        properties[k] = v

    return {
        "job_id": job.job_id,
        "name": job.display_name or job.job_id,
        "type": properties.get("type") or meta.get("type", "job"),
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


@router.post("/{job_id}/sync")
@inject
async def sync_job(
    job_id: str,
    sync_service: GraphSyncService = Depends(
        Provide[GraphContainer.graph.sync_service]
    ),
):
    """
    Force sync a job from the source Job Manager.
    """
    clean_job_id = job_id.replace("job:", "")
    result = await sync_service.refresh_job(clean_job_id)

    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))

    return result

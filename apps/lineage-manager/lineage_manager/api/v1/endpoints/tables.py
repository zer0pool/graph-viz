import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.table_service import TableService
from lineage_manager.api.v1.schemas import TableLineageSummaryResponse

logger = logging.getLogger(__name__)

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/tables",
    tags=["Tables"],
    dependencies=AUTH_DEPS,
)


@router.get("/{table_name:path}/impact")
@inject
def get_table_impact(
    table_name: str,
    max_depth: int = Query(3, ge=1, le=10),
    include_jobs: bool = Query(True),
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """
    Return downstream tables impacted by a base table, with writer jobs per depth.
    """
    return svc.get_table_impact(
        table_name=table_name, max_depth=max_depth, include_jobs=include_jobs
    )


@router.get("/{table_name:path}/triggers")
@inject
def get_table_dependencies(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Get trigger ON/OFF status per job that consumes the table."""
    return svc.get_table_dependencies(table_name)


@router.get("/{table_name:path}/hierarchy")
@inject
def get_table_hierarchy(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Return full upstream/downstream lineage hierarchy for List View."""
    return svc.get_table_hierarchy(table_name)


@router.get(
    "/{table_name:path}/lineage-summary",
    response_model=TableLineageSummaryResponse,
)
@inject
def get_table_lineage_summary(
    table_name: str,
    max_roots: int = Query(50, ge=1, le=200),
    max_leaves: int = Query(50, ge=1, le=200),
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Return aggregated lineage metrics for the table detail lineage panel."""
    result = svc.get_table_lineage_summary(
        table_name, max_roots=max_roots, max_leaves=max_leaves
    )
    if result.get("status") != "success":
        code = result.get("error_code")
        message = result.get("message", "Failed to compute lineage summary.")
        if code == "TABLE_NOT_FOUND":
            raise HTTPException(status_code=404, detail=message)
        raise HTTPException(status_code=500, detail=message)

    return result


@router.patch("/{table_name:path}/triggers/{job_id}")
@inject
async def set_table_dependency(
    table_name: str,
    job_id: str,
    body: dict = Body(..., example={"trigger": "HARD"}),
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Set dependency type (HARD/SOFT) for a job that consumes the table, and emit SSE."""
    # Support both old boolean format and new string format
    trigger_value = body.get("trigger", "SOFT")
    if isinstance(trigger_value, bool):
        dependency_type = "HARD" if trigger_value else "SOFT"
    else:
        dependency_type = str(trigger_value).upper()
        if dependency_type not in ("HARD", "SOFT"):
            dependency_type = "SOFT"
    
    return await svc.set_table_dependency(table_name, job_id, dependency_type)



@router.get("/{table_name:path}/details")
@inject
def get_table_details_legacy(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """
    DEPRECATED: Use /detail instead.
    Get detailed metadata for a table (schema, storage, etc).
    """
    return svc.get_table_details(table_name)


@router.patch("/{table_name:path}/triggers")
@inject
async def bulk_set_table_dependency(
    table_name: str,
    body: dict = Body(..., example={"trigger": "SOFT"}),
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Bulk set dependency type for all jobs that consume the table.

    Body: { "trigger": "HARD"|"SOFT" } or { "trigger": true|false } (legacy)
    """
    trigger_value = body.get("trigger", "SOFT")
    if isinstance(trigger_value, bool):
        dependency_type = "HARD" if trigger_value else "SOFT"
    else:
        dependency_type = str(trigger_value).upper()
        if dependency_type not in ("HARD", "SOFT"):
            dependency_type = "SOFT"
    
    return await svc.bulk_set_table_dependencies(table_name, dependency_type)



@router.get("/{table_name:path}/load-history")
@inject
async def get_table_load_history(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Return load timeline data from Table service."""
    return svc.get_table_load_history(table_name)


@router.get("/{table_name:path}/timelines")
@inject
async def get_table_timelines(
    table_name: str,
    days: int = 7,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
) -> dict:
    """Return timelines data from Table service."""
    return svc.get_table_timelines(table_name, days)


@router.get("/{table_name:path}/schema")
@inject
async def get_table_schema(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Return table schema from Table service."""
    return svc.get_table_schema(table_name)


@router.get("/{table_name:path}/detail")
@inject
async def get_table_detail(
    table_name: str,
    svc: TableService = Depends(Provide[GraphContainer.table.table_service]),
):
    """Return table detail metadata from Table service."""
    return svc.get_table_details(table_name)


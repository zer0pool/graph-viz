import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from graph_manager.core.auth import require_authenticated_user
from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_service import GraphService
from graph_manager.services.graph_query_service import GraphQueryService
from graph_manager.core.sse import broker
from fastapi import Body

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/tables",
    tags=["Tables"],
    dependencies=[Depends(require_authenticated_user)],
)


@router.get("/{table_name}/impact")
@inject
def get_table_impact(
    table_name: str,
    max_depth: int = Query(3, ge=1, le=10),
    include_jobs: bool = Query(True),
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_query_service]),
):
    """
    Return downstream tables impacted by a base table, with writer jobs per depth.
    """
    logger.info(
        f"Received impact request for table={table_name}, max_depth={max_depth}, include_jobs={include_jobs}"
    )
    return graph_service.get_table_impact(
        base_table=table_name, max_depth=max_depth, include_jobs=include_jobs
    )


@router.get("/{table_name}/triggers")
@inject
def get_table_triggers(
    table_name: str,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph_query_service]),
):
    """Get trigger ON/OFF status per job that consumes the table."""
    return svc.get_table_triggers(table_name)


@router.patch("/{table_name}/triggers/{job_id}")
@inject
async def set_table_trigger(
    table_name: str,
    job_id: str,
    body: dict = Body(..., example={"trigger": True}),
    svc: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """Set trigger ON/OFF for a job that consumes the table, and emit SSE."""
    trigger = bool(body.get("trigger", True))
    result = svc.set_table_trigger(table_name, job_id, trigger)
    if result.get("status") == "success":
        await broker.publish("trigger_update", result)
    return result


@router.patch("/{table_name}/triggers")
@inject
async def bulk_set_table_trigger(
    table_name: str,
    body: dict = Body(..., example={"trigger": False}),
    svc: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """Bulk set trigger ON/OFF for all jobs that consume the table.

    Body: { "trigger": true|false }
    """
    want = bool(body.get("trigger", False))
    result = svc.bulk_set_table_triggers(table_name, want)
    # Emit SSE for each changed job for live UIs
    if result.get("status") == "success":
        for jid in result.get("changed", []):
            await broker.publish(
                "trigger_update",
                {
                    "status": "success",
                    "job_id": jid,
                    "table_name": table_name,
                    "previous_state": None,
                    "new_state": want,
                },
            )
    return result

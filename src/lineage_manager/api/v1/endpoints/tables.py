import asyncio
import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Body, Depends, Query

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.core.sse import broker
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)

AUTH_DEPS = [Depends(require_authenticated_user)] if is_auth_enabled() else []

router = APIRouter(
    prefix="/api/v1/tables",
    tags=["Tables"],
    dependencies=AUTH_DEPS,
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


@router.get("/{table_name}/load-history")
async def get_table_load_history(table_name: str):
    """Return dummy load timeline data with a guaranteed 1s response time."""
    await asyncio.sleep(1)
    timeline = [
        {
            "run_id": "2024-07-03T08:15:00Z",
            "status": "SUCCESS",
            "duration_sec": 142,
            "updated_at": "2024-07-03T08:17:22Z",
            "rows_loaded": 1520,
            "source_job": "JOB_DAILY_LOAD",
            "notes": "Scheduled daily ingestion",
            "data_interval_start": "2024-07-03T06:00:00Z",
            "data_interval_end": "2024-07-03T08:00:00Z",
            "interval": "06:00–08:00 UTC",
        },
        {
            "run_id": "2024-07-02T08:15:00Z",
            "status": "SUCCESS",
            "duration_sec": 125,
            "updated_at": "2024-07-02T08:17:05Z",
            "rows_loaded": 1439,
            "source_job": "JOB_DAILY_LOAD",
            "notes": "Scheduled daily ingestion",
            "data_interval_start": "2024-07-02T06:00:00Z",
            "data_interval_end": "2024-07-02T08:00:00Z",
            "interval": "06:00–08:00 UTC",
        },
        {
            "run_id": "2024-07-01T08:15:00Z",
            "status": "FAILED",
            "duration_sec": 30,
            "updated_at": "2024-07-01T08:15:45Z",
            "rows_loaded": 0,
            "source_job": "JOB_DAILY_LOAD",
            "notes": "Timeout contacting source API",
            "data_interval_start": "2024-07-01T06:00:00Z",
            "data_interval_end": "2024-07-01T08:00:00Z",
            "interval": "06:00–08:00 UTC",
        },
    ]
    return {
        "status": "success",
        "input": {"table": table_name},
        "result": {"timeline": timeline},
    }


@router.get("/{table_name}/timeliness")
async def get_table_timeliness(table_name: str, days: int = 7):
    """Dummy timeliness data for ECharts timeline."""
    await asyncio.sleep(1)
    daily_summary = []
    for idx in range(days):
        success = max(0, 24 - idx)
        fail = idx % 3
        status = "good" if fail == 0 else ("warning" if fail == 1 else "bad")
        daily_summary.append(
            {
                "date": f"2025-04-{idx + 1:02d}",
                "success_count": success,
                "fail_count": fail,
                "status": status,
                "rate": round(success / 24, 3),
            }
        )
    hourly_detail = {
        daily_summary[-1]["date"]: [
            {
                "hour": f"{hour:02d}",
                "state": "loaded" if hour % 3 else "missing",
                "interval_start": f"2025-04-{days:02d}T{hour:02d}:00:00Z",
                "interval_end": f"2025-04-{days:02d}T{hour:02d}:59:59Z",
            }
            for hour in range(24)
        ]
    }
    return {
        "status": "success",
        "input": {"table": table_name, "days": days},
        "result": {"daily_summary": daily_summary, "hourly_detail": hourly_detail},
    }

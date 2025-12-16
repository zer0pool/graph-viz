import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.core.sse import broker
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.bigquery_protocol import BigQueryServiceProtocol
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
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """
    Return downstream tables impacted by a base table, with writer jobs per depth.
    """
    logger.info(
        f"Received impact request for table={table_name}, max_depth={max_depth}, include_jobs={include_jobs}"
    )
    return svc.get_table_impact(
        base_table=table_name, max_depth=max_depth, include_jobs=include_jobs
    )


@router.get("/{table_name:path}/triggers")
@inject
def get_table_triggers(
    table_name: str,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """Get trigger ON/OFF status per job that consumes the table."""
    if _is_external_storage(table_name):
        return {"status": "success", "table": table_name, "count": 0, "jobs": []}
    return svc.get_table_triggers(table_name)


@router.get("/{table_name:path}/hierarchy")
@inject
def get_table_hierarchy(
    table_name: str,
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """Return full upstream/downstream lineage hierarchy for List View."""
    return svc.get_table_lineage_hierarchy(table_name)


@router.get(
    "/{table_name:path}/lineage-summary",
    response_model=TableLineageSummaryResponse,
)
@inject
def get_table_lineage_summary(
    table_name: str,
    max_roots: int = Query(50, ge=1, le=200),
    max_leaves: int = Query(50, ge=1, le=200),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
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

    # Ensure upstream/downstream sections carry both root/leaf keys for schema compatibility
    result.setdefault("upstream", {}).setdefault("root_tables", [])
    result["upstream"].setdefault("leaf_tables", [])
    result.setdefault("downstream", {}).setdefault("leaf_tables", [])
    result["downstream"].setdefault("root_tables", [])
    return result


@router.patch("/{table_name:path}/triggers/{job_id}")
@inject
async def set_table_trigger(
    table_name: str,
    job_id: str,
    body: dict = Body(..., example={"trigger": True}),
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
):
    """Set trigger ON/OFF for a job that consumes the table, and emit SSE."""
    trigger = bool(body.get("trigger", True))
    result = svc.set_table_trigger(table_name, job_id, trigger)
    if result.get("status") == "success":
        await broker.publish("trigger_update", result)
    return result


@router.get("/{table_name:path}/details")
@inject
def get_table_details(
    table_name: str,
    bq_service: BigQueryServiceProtocol = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """
    Get detailed metadata for a table (schema, storage, etc).
    For demo purposes, this always fetches metadata from 'gizmopool.test_data.table_load_history'
    but allows the frontend to display the requested table_name as the identity.
    """
    target_table = "gizmopool.test_data.table_load_history"
    try:
        # Fetch real BQ metadata for the test table
        details = bq_service.get_table_detail(target_table)
        
        # Patch the identity to match the requested table
        details["full_name"] = table_name
        # Optionally patch description if you want it to look generic or keep the real one
        
        return {"status": "success", "result": details}
    except Exception as e:
        logger.error(f"Failed to fetch table details for {table_name}: {e}")
        # Return a graceful error structure or raise 500
        return {
            "status": "error", 
            "message": str(e),
            "result": {
                "full_name": table_name,
                "description": "Could not retrieve remote metadata."
            }
        }


@router.patch("/{table_name:path}/triggers")
@inject
async def bulk_set_table_trigger(
    table_name: str,
    body: dict = Body(..., example={"trigger": False}),
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
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


@router.get("/{table_name:path}/load-history")
@inject
async def get_table_load_history(
    table_name: str,
    bigquery_svc: BigQueryServiceProtocol = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return load timeline data from BigQuery service.
    
    The service implementation (Real or Dummy) is selected by the DI container
    based on the enable_bigquery feature flag.
    """
    timeline = bigquery_svc.get_table_load_history(table_name)
    return {
        "status": "success",
        "input": {"table": table_name},
        "result": {"timeline": timeline},
    }



@router.get("/{table_name:path}/timeliness")
@inject
async def get_table_timeliness(
    table_name: str,
    days: int = 7,
    bigquery_svc: BigQueryServiceProtocol = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
) -> dict:
    """Return timeliness data from BigQuery service.
    
    The service implementation (Real or Dummy) is selected by the DI container
    based on the enable_bigquery feature flag.
    """
    payload = bigquery_svc.get_table_timelines_for_table(table_name, days)
    return {
        "status": "success",
        "input": {"table": table_name, "days": days},
        "result": payload
    }



@router.get("/{table_name:path}/schema")
@inject
async def get_table_schema(
    table_name: str,
    bigquery_svc: BigQueryServiceProtocol = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return table schema from BigQuery service.
    
    The service implementation (Real or Dummy) is selected by the DI container
    based on the enable_bigquery feature flag.
    """
    cols = bigquery_svc.get_table_schema(table_name)
    return {
        "status": "success",
        "input": {"requested": table_name},
        "result": {"columns": cols}
    }



def _is_external_storage(name: str) -> bool:
    return name.startswith("s3://") or name.startswith("gs://") or name.startswith("gcs://") or "/" in name


@router.get("/{table_name:path}/detail")
@inject
async def get_table_detail(
    table_name: str,
    bigquery_svc: BigQueryServiceProtocol = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return table detail metadata from BigQuery service.
    
    The service implementation (Real or Dummy) is selected by the DI container
    based on the enable_bigquery feature flag.
    
    For external storage paths (S3/GCS), returns specific metadata structure.
    """
    if _is_external_storage(table_name):
        return {
            "status": "success",
            "input": {"requested": table_name},
            "result": {
                "full_name": table_name,
                "table_type": "EXTERNAL",
                "description": "-",
                "location": "-",
                "created": "-",
                "modified": "-",
                "expires": None,
                "labels": {},
                "storage": {
                    "storage_type": "S3" if "s3" in table_name else "External",
                    "num_rows": "-",
                    "num_bytes": "-",
                },
            },
        }

    info = bigquery_svc.get_table_detail(table_name)
    return {
        "status": "success",
        "input": {"requested": table_name},
        "result": info
    }


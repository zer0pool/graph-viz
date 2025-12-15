import asyncio
import logging
import os
import random

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.core.sse import broker
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.bigquery_service import BigQueryService
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
    bq_service: BigQueryService = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
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
    bigquery_svc: BigQueryService = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return load timeline data. Queries BigQuery if enabled, otherwise returns dummy data."""
    from lineage_manager.core.config import get_settings
    settings = get_settings()

    if settings.feature_flags.enable_bigquery:
        try:
            timeline = bigquery_svc.get_table_load_history(table_name)
            return {
                "status": "success",
                "input": {"table": table_name},
                "result": {"timeline": timeline},
            }
        except Exception as err:
            logger.warning(f"BigQuery load history fetch failed: {err}. Falling back to dummy data.")

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


@router.get("/{table_name:path}/timeliness")
@inject
async def get_table_timeliness(
    table_name: str,
    days: int = 7,
    bigquery_svc: BigQueryService = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
) -> dict:
    """Return timeliness by querying `gizmopool.test_data.table_load_history` for the
    given table_name. The function will match only on `table_name` column (ignoring project/dataset).
    Falls back to dummy data if BigQuery access fails.
    """
    from lineage_manager.core.config import get_settings
    settings = get_settings()
    
    # Try to get real timelines via BigQuery helper if enabled
    if settings.feature_flags.enable_bigquery:
        try:
            payload = bigquery_svc.get_table_timelines_for_table(table_name, days)
            return {"status": "success", "input": {"table": table_name, "days": days}, "result": payload}
        except Exception as err:
            logger.warning(f"BigQuery timelines fetch failed: {err}. Falling back to dummy data.")

    # Fallback: previous dummy implementation
    await asyncio.sleep(1)
    from datetime import date, timedelta
    today = date.today()
    
    daily_summary = []
    # Generate last N days ending today
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        d_str = d.isoformat()
        
        # logical index for pattern
        idx = days - 1 - i
        success = max(0, 24 - idx)
        fail = idx % 3
        status = "good" if fail == 0 else ("warning" if fail == 1 else "bad")
        daily_summary.append(
            {
                "date": d_str,
                "period": "HOURLY", 
                "success_count": success,
                "fail_count": fail,
                "status": status,
                "rate": round(success / 24, 3),
            }
        )

    last_date = daily_summary[-1]["date"]
    hourly_detail = {
        last_date: [
            {
                "hour": f"{hour:02d}",
                "state": "loaded" if hour % 3 else "missing",
                "interval_start": f"{last_date}T{hour:02d}:00:00Z",
                "interval_end": f"{last_date}T{hour:02d}:59:59Z",
            }
            for hour in range(24)
        ]
    }
    return {
        "status": "success",
        "input": {"table": table_name, "days": days},
        "result": {
            "daily_summary": daily_summary, 
            "hourly_detail": hourly_detail,
            "time_range": {
                "start": daily_summary[-1]["date"] if daily_summary else None, # Oldest in list loop (actually loop is reverse so check order)
                # Wait, loop was: for i in range(days - 1, -1, -1). 
                # idx=0 (oldest) -> appended first?
                # No, loop i=6 (oldest) to 0 (today).
                # d = today - 6 days.
                # So daily_summary[0] is Oldest. daily_summary[-1] is Today.
                "start": daily_summary[0]["date"],
                "end": daily_summary[-1]["date"],
            }
        },
    }


@router.get("/{table_name:path}/schema")
@inject
async def get_table_schema(
    table_name: str,
    bigquery_svc: BigQueryService = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return fixed dummy schema for a test BigQuery table regardless of input.

    This ignores `table_name` and always returns the schema for
    `gizmopool.austin_bikeshare.bikeshare_stations` as a placeholder until
    real BigQuery integration is implemented.
    """
    from lineage_manager.core.config import get_settings
    settings = get_settings()
    
    # Fixed table used for frontend/testing
    fixed_full_name = "gizmopool.austin_bikeshare.bikeshare_stations"

    # If enable_bigquery is set, try to fetch real schema from BigQuery when possible.
    use_bq = settings.feature_flags.enable_bigquery

    # 50% chance to return hacker_news sample schema to exercise RECORD columns
    pick_hacker = random.random() < 0.5
    hacker_table = "bigquery-public-data.hacker_news.comments"

    if pick_hacker and use_bq:
        try:
            cols = bigquery_svc.get_table_schema(hacker_table)
            return {"status": "success", "input": {"requested": table_name, "resolved": hacker_table}, "result": {"columns": cols}}
        except Exception:
            # fallback to static hacker sample if BQ fetch fails
            pick_hacker = True

    if pick_hacker and not use_bq:
        # Return a static sample schema with a RECORD (nested) column to exercise UI
        columns = [
            {"name": "id", "type": "INTEGER", "mode": "NULLABLE", "description": "Comment id", "policy_tags": []},
            {"name": "by", "type": "STRING", "mode": "NULLABLE", "description": "Author", "policy_tags": []},
            {
                "name": "metadata",
                "type": "RECORD",
                "mode": "REPEATED",
                "description": "Nested metadata",
                "policy_tags": [],
                "fields": [
                    {"name": "source","type": "STRING","mode": "NULLABLE","description": "source"},
                    {"name": "score","type": "INTEGER","mode": "NULLABLE","description": "score"},
                ],
            },
            {"name": "text", "type": "STRING", "mode": "NULLABLE", "description": "Comment text", "policy_tags": []},
        ]
        return {"status": "success", "input": {"requested": table_name, "resolved": hacker_table}, "result": {"columns": columns}}

    # Default: return fixed stations schema (or real BQ if enabled)
    if use_bq:
        try:
            cols = bigquery_svc.get_table_schema(fixed_full_name)
            return {"status": "success", "input": {"requested": table_name, "resolved": fixed_full_name}, "result": {"columns": cols}}
        except Exception:
            # fallback to static
            pass

    columns = [
        {
            "name": "station_id",
            "type": "INTEGER",
            "mode": "REQUIRED",
            "description": "Unique station identifier",
            "policy_tags": [],
        },
        {
            "name": "name",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Station name",
            "policy_tags": [],
        },
        {
            "name": "latitude",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Latitude coordinate",
            "policy_tags": [],
        },
        {
            "name": "longitude",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Longitude coordinate",
            "policy_tags": [],
        },
        {
            "name": "capacity",
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Number of docks",
            "policy_tags": [],
        },
    ]
    return {
        "status": "success",
        "input": {"requested": table_name, "resolved": fixed_full_name},
        "result": {"columns": columns},
    }


def _is_external_storage(name: str) -> bool:
    return name.startswith("s3://") or name.startswith("gs://") or name.startswith("gcs://") or "/" in name


@router.get("/{table_name:path}/detail")
@inject
async def get_table_detail(
    table_name: str,
    bigquery_svc: BigQueryService = Depends(Provide[GraphContainer.bigquery.bigquery_service]),
):
    """Return fixed dummy table detail metadata for a test BigQuery table.

    If S3/GCS path, returns specific dummy data.
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

    from lineage_manager.core.config import get_settings
    settings = get_settings()
    
    fixed_full_name = "gizmopool.austin_bikeshare.bikeshare_stations"

    # If BigQuery is enabled, attempt to fetch real detail; otherwise return static fixture
    use_bq = settings.feature_flags.enable_bigquery
    if use_bq:
        try:
            info = bigquery_svc.get_table_detail(fixed_full_name)
            return {"status": "success", "input": {"requested": table_name, "resolved": fixed_full_name}, "result": info}
        except Exception as err:
            logger.warning(f"BigQuery get_table_detail failed: {err}; falling back to static detail")

    detail = {
        "full_name": fixed_full_name,
        "table_type": "TABLE",
        "description": "Austin bikeshare stations reference data",
        "location": "US",
        "created": "2025-01-10T12:00:00+00:00",
        "modified": "2025-11-10T19:07:12+09:00",
        "expires": None,
        "labels": {"env": "dev", "team": "data-platform"},
        "storage": {
            "num_rows": 234,
            "num_bytes": 12345,
            "partitioning": None,
            "clustering": [],
            "encryption": "Google-managed key",
        },
    }
    return {"status": "success", "input": {"requested": table_name}, "result": detail}

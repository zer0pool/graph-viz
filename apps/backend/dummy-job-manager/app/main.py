from fastapi import FastAPI, Query
from datetime import datetime, timedelta, timezone
from app.api.v1.endpoints import router as v1_router
from app.infrastructure.repository import LineageRepository

app = FastAPI(
    title="Connected DAG Dummy Job Manager (DDD Structure)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Include V1 Router
app.include_router(v1_router, prefix="/api/v1", tags=["v1"])

repo = LineageRepository()

# Legacy / Non-standard endpoints that don't fit into /api/v1 router nicely without prefix issues
# or if they are legacy root paths.

@app.get("/api/job/{job_id}")
def get_job_legacy(job_id: str):
    """Legacy endpoint for Job Manager compatibility."""
    return repo.get_by_id(job_id)

@app.get("/api/job/job-run-history/")
def get_job_run_history_legacy(
    job_id: str = Query(...),
    limit: int = 100,
    offset: int = 0
):
    """Legacy endpoint called by Lineage Manager adapter."""
    return get_job_run_history(job_id)

@app.get("/job/{job_id}/run-history")
def get_job_run_history(job_id: str):
    """Return 30 synthetic run-history items for the given job."""
    base_end = datetime(2025, 12, 3, 1, 0, tzinfo=timezone.utc)
    runs = []
    for idx in range(30):
        end_at = base_end - timedelta(days=idx)
        start_at = end_at + timedelta(hours=-72 + (idx % 6))  # some variety
        # Alternate states
        state = ["RUNNING", "SUCCESS", "FAILED", "SUCCESS", "SUCCESS", "FAILED"][idx % 6]
        finish_time = None if state == "RUNNING" else start_at + timedelta(minutes=30 + idx)
        runs.append(
            {
                "job_id": job_id,
                "data_interval_end": end_at.strftime("%Y-%m-%dT%H:%M:%S"),
                "dag_run_id": f"scheduled__{(end_at - timedelta(days=1)).isoformat()}",
                "state": state,
                "start_time": start_at.strftime("%Y-%m-%dT%H:%M:%S"),
                "finish_time": finish_time.strftime("%Y-%m-%dT%H:%M:%S") if finish_time else None,
                "delay_criteria": [],
                "notified": False if state != "RUNNING" else None,
            }
        )
    return runs

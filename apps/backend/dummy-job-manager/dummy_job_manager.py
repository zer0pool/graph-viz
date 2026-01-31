"""
Connected DAG Dummy Job Manager (File-Based)
=================================================

This dummy server serves static JSON responses from the 'app/data' directory.
"""
from pydantic import BaseModel
from fastapi import FastAPI, Query, HTTPException
from typing import Optional, List, Dict, Any
import json
import os
import glob
from enum import Enum

app = FastAPI(
    title="Connected DAG Dummy Job Manager (File-Based)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "app", "data")
LINEAGE_DIR = os.path.join(DATA_DIR, "lineage")
HISTORY_DIR = os.path.join(DATA_DIR, "run-history")
 
class SchedulingType(str, Enum):
    SELF_TYPE = "SELF-TYPE"
    REQUEST_TYPE = "REQUEST-TYPE"


# =====================================================================
# Helper Functions
# =====================================================================
def load_json_file(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return {}

def load_lineage_items(filename: str) -> List[Dict[str, Any]]:
    path = os.path.join(LINEAGE_DIR, filename)
    data = load_json_file(path)
    return data.get("items", [])


# =====================================================================
# Request body models
# =====================================================================
class JobSelector(BaseModel):
    type: str
    job_id: str

class JobSelectorRequest(BaseModel):
    jobs: List[JobSelector]

# =====================================================================
# API Endpoints
# =====================================================================
@app.get("/api/v1/jobs/scheduling-lineage/")
def get_scheduling_lineage(
    scheduling_type: Optional[SchedulingType] = Query(default=None),
    offset: int = 0,
    limit: int = 100,
):
    """Paginated static lineage data from file based on scheduling_type."""
    
    # Determine which file to load
    if scheduling_type == SchedulingType.SELF_TYPE:
        items = load_lineage_items("SELF-TYPE.json")
    elif scheduling_type == SchedulingType.REQUEST_TYPE:
        items = load_lineage_items("REQUEST-TYPE.json")
    else:
        # Fallback or empty if no type specified
        # Usually client specifies type. If not, maybe return empty or all?
        # User spec said: "Map parameters to files".
        items = [] 
        # Optionally, load both if no type? 
        # For now, return empty if type not matching known files.

    total = len(items)
    end = offset + limit
    page = items[offset:end]
    next_offset = end if end < total else None

    return {
        "status": "success",
        "result": page,
        "input": {
            "scheduling_type": scheduling_type,
            "offset": offset,
            "limit": limit
        },
        "pagination": {
            "limit": limit,
            "offset": offset,
            "next_offset": next_offset,
            "total": total,
        },
    }


@app.get("/api/job/{job_id}")
def get_job_legacy(job_id: str):
    """
    Legacy endpoint for Job Manager compatibility.
    Searches across all lineage files to find the job.
    """
    # Load all lineage data
    # (Inefficient but fine for dummy tool)
    all_items = []
    for f in glob.glob(os.path.join(LINEAGE_DIR, "*.json")):
         data = load_json_file(f)
         all_items.extend(data.get("items", []))

    for item in all_items:
        if item.get("job_id") == job_id:
            return item
    return None

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
    """Return run-history items for the given job from file."""
    
    # Try specific file
    file_path = os.path.join(HISTORY_DIR, f"{job_id}.json")
    if not os.path.exists(file_path):
        # Fallback to default
        file_path = os.path.join(HISTORY_DIR, "default.json")
    
    runs = load_json_file(file_path)
    
    # If the file contains list directly, allow it. If dict, extract items?
    # Usually run history is a list.
    if isinstance(runs, list):
        return runs
    return []


@app.post("/api/v1/jobs/scheduling-lineage/by_ids")
def get_scheduling_lineage_by_ids(payload: JobSelectorRequest):
    """Return specific jobs by ID by searching all lineage files."""
    requested_ids = {j.job_id for j in payload.jobs}
    
    # Load all lineage data
    all_items = []
    for f in glob.glob(os.path.join(LINEAGE_DIR, "*.json")):
         data = load_json_file(f)
         all_items.extend(data.get("items", []))

    results = [j for j in all_items if j.get("job_id") in requested_ids]

    return {
        "status": "success",
        "result": results,
        "pagination": {"limit": len(results), "offset": 0, "next_offset": None, "total": len(results)},
    }

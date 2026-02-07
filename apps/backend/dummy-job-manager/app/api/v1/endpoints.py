from fastapi import APIRouter, Query, Body
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from app.domain.schemas import JobSelectorRequest, SchedulingType
from app.infrastructure.repository import LineageRepository

router = APIRouter()
repo = LineageRepository()

@router.get("/jobs/scheduling-lineage/")
def get_scheduling_lineage(
    scheduling_type: Optional[SchedulingType] = Query(default=None),
    offset: int = 0,
    limit: int = 100,
):
    """Paginated static lineage data from file."""
    """Paginated static lineage data from file."""
    if scheduling_type:
        target_type = scheduling_type.value
        filtered = repo.get_lineage_data(target_type)
    else:
        filtered = repo.get_all()

    total = len(filtered)
    end = offset + limit
    page = filtered[offset:end]
    next_offset = end if end < total else None

    return {        
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

@router.post("/jobs/scheduling-lineage/by_ids")
def get_scheduling_lineage_by_ids(payload: JobSelectorRequest):
    """Return specific jobs by ID from the static dataset."""
    requested_ids = {j.job_id for j in payload.jobs}
    results = repo.get_by_ids(requested_ids)

    return {
        "status": "success",
        "result": results,
        "pagination": {"limit": len(results), "offset": 0, "next_offset": None, "total": len(results)},
    }

# Legacy Endpoints (Keep for compatibility if needed, using simple/root path usually)
# But standardizing on v1 router here.

# Note: The legacy paths like `/api/job/{job_id}` might need to be at root app level 
# or handled via this router if we prefix it.

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, root_validator


class SchedulingLineageDependency(BaseModel):
    """Represents an upstream or downstream entity coming from Job Manager."""

    type: str = Field(..., description="Entity type. Tables are reported as 'table'.")
    name: str = Field(..., description="Fully qualified identifier (e.g., project.dataset.table).")
    trigger: Optional[bool] = Field(
        None, description="True when the upstream table is configured as a trigger."
    )

    class Config:
        extra = "allow"


class SchedulingLineageSchedule(BaseModel):
    """Scheduling information block."""

    interval: Optional[str] = Field(
        None, description="Primary scheduling interval (e.g., '@daily')."
    )
    cron: Optional[str] = Field(None, description="Cron expression if provided separately.")
    timezone: Optional[str] = Field(None, description="Timezone for the schedule.")
    start_at: Optional[datetime] = Field(None, description="Schedule start timestamp.")
    end_at: Optional[datetime] = Field(None, description="Schedule end timestamp.")

    class Config:
        extra = "allow"


class SchedulingLineage(BaseModel):
    """
    Canonical job payload returned by the Job Manager /api/v1/jobs/scheduling-lineage API.
    """

    type: Optional[str] = Field(
        None, description="Scheduling type identifier (SELF-TYPE, REQUEST-TYPE, etc.)."
    )
    job_id: str = Field(..., description="Unique job identifier.")
    name: str = Field(..., description="Display name for the job.")
   
    
    schedule: Optional[SchedulingLineageSchedule] = Field(
        None, description="Scheduling configuration block."
    )
    upstreams: List[SchedulingLineageDependency] = Field(
        default_factory=list, description="Upstream dependencies emitted by Job Manager."
    )
    downstreams: List[SchedulingLineageDependency] = Field(
        default_factory=list, description="Downstream dependents emitted by Job Manager."
    )
    create_datetime: Optional[datetime] = Field(None, description="Creation timestamp.")
    update_datetime: Optional[datetime] = Field(None, description="Last update timestamp.")
    successful_dag_runs_count: Optional[int] = Field(
        None, description="Count of successful DAG runs as reported by Job Manager."
    )
    
    # Support both 'metadata' and 'properties' for backward compatibility
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Job and table properties (preferred over 'metadata')"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="DEPRECATED: Use 'properties' instead. Kept for backward compatibility."
    )

    class Config:
        extra = "allow"

    @root_validator(pre=True)
    def handle_metadata_and_properties(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Support both 'metadata' and 'properties' names with backward compatibility.
        
        Logic:
        1. Collect non-lineage fields into a temp dict
        2. Merge existing metadata and properties
        3. Set both fields for compatibility
        """
        # Fields to pack into metadata/properties
        to_pack = (
            "owner",
            "labels",
            "run_status",
            "write_mode",
            "trigger_tables",
            "reference_tables",
            "destinations",
            "reference_service",
            "configurations",
            "scheduling_type",
            "revision_ids",
            "status",
            "draft_status",
            "destination",
        )
        
        # Start with existing metadata and properties
        metadata = dict(values.get("metadata") or {})
        properties = dict(values.get("properties") or {})
        
        # Pack non-lineage fields
        for key in to_pack:
            if key in values:
                val = values.pop(key)
                metadata.setdefault(key, val)
                properties.setdefault(key, val)
        
        # Merge: properties takes precedence over metadata
        merged = {**metadata, **properties}
        
        # Set both for backward compatibility
        values["properties"] = merged
        values["metadata"] = merged
        
        return values


class SchedulingLineagePagination(BaseModel):
    """Pagination block returned alongside the job list."""

    limit: Optional[int] = Field(None, description="Page size used by the Job Manager API.")
    offset: Optional[int] = Field(None, description="Current page offset.")
    next_offset: Optional[int] = Field(None, description="Offset to request the next page, if any.")
    total: Optional[int] = Field(None, description="Total number of items available on the server.")

    class Config:
        extra = "allow"


class SchedulingLineageResponse(BaseModel):
    """Top-level wrapper returned by /api/v1/jobs/scheduling-lineage/."""

    status: Optional[str] = Field(None, description="Request status string supplied by Job Manager.")
    result: List[SchedulingLineage] = Field(
        default_factory=list, description="List of job payloads."
    )
    pagination: Optional[SchedulingLineagePagination] = Field(
        None, description="Pagination metadata for the result set."
    )
    message: Optional[str] = Field(None, description="Optional message supplied by the API.")

    class Config:
        extra = "allow"

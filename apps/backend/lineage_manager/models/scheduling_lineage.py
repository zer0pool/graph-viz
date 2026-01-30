from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SchedulingLineageDependency(BaseModel):
    """Represents an upstream or downstream entity coming from Job Manager."""

    type: str = Field(..., description="Entity type. Typically 'table'.")
    name: str = Field(..., description="Fully qualified identifier.")
    storage: str = Field(..., description="Storage type (bigquery, s3, gcs, etc.)")
    dependency_type: Optional[str] = Field(
        None, description="HARD or SOFT (for upstreams)"
    )
    write_mode: Optional[str] = Field(
        None, description="APPEND or OVERWRITE (for downstreams)"
    )

    model_config = ConfigDict(extra="allow")


class SchedulingLineageSchedule(BaseModel):
    """Scheduling information block."""

    cron_expression: Optional[str] = Field(None)
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)

    model_config = ConfigDict(extra="allow")


class SchedulingLineage(BaseModel):
    """
    Canonical job payload returned by the Job Manager API.
    """

    job_id: str = Field(..., description="Unique job identifier.")
    type: str = Field(..., description="Job type (SELF-TYPE, REQUEST-TYPE, etc.)")
    name: str = Field(..., description="Display name for the job.")
    status: str = Field(..., description="Running status (e.g. RUNNING)")

    schedule: Optional[SchedulingLineageSchedule] = Field(None)
    upstreams: List[SchedulingLineageDependency] = Field(default_factory=list)
    downstreams: List[SchedulingLineageDependency] = Field(default_factory=list)

    governance: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow")


class SchedulingLineagePagination(BaseModel):
    """Pagination block returned alongside the job list."""

    limit: Optional[int] = Field(None)
    offset: Optional[int] = Field(None)
    next_offset: Optional[int] = Field(None)
    total: Optional[int] = Field(None)

    model_config = ConfigDict(extra="allow")


class SchedulingLineageResponse(BaseModel):
    """Top-level wrapper returned by Job Manager API."""

    status: Optional[str] = Field(None)
    result: List[SchedulingLineage] = Field(default_factory=list)
    pagination: Optional[SchedulingLineagePagination] = Field(None)
    message: Optional[str] = Field(None)

    model_config = ConfigDict(extra="allow")

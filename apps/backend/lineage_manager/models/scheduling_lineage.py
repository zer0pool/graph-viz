from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SchedulingLineageDependency(BaseModel):
    """Represents an upstream or downstream entity coming from Job Manager."""

    type: str = Field(..., description="Entity type. Typically 'table'.")
    name: str = Field(..., description="Fully qualified identifier.")
    storage: Optional[str] = Field(None, description="Storage type (bigquery, s3, gcs, etc.)")

    @field_validator('name', 'type', 'storage', mode='before')
    @classmethod
    def sanitize_strings(cls, v):
        """Strip whitespace from strings."""
        if isinstance(v, str):
            return v.strip()
        return v
    
    # For upstreams
    trigger: Optional[bool] = Field(
        None, description="Whether this dependency triggers the job (for upstreams)"
    )
    
    # For downstreams
    write_mode: Optional[str] = Field(
        None, description="APPEND or OVERWRITE (for downstreams)"
    )

    model_config = ConfigDict(extra="allow")


class SchedulingLineageSchedule(BaseModel):
    """Scheduling information block."""
    
    interval: Optional[str] = Field(None, description="Interval (e.g., @daily)")
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)

    model_config = ConfigDict(extra="allow")


class SchedulingLineageStorageInfo(BaseModel):
    """Storage information for S3/GCS targets."""

    bucket_name: Optional[str] = Field(None)
    object_key: Optional[str] = Field(None)
    full_path: Optional[str] = Field(None)

    model_config = ConfigDict(extra="allow")


class SchedulingLineageTargetMeta(BaseModel):
    """Target/table metadata - structure varies by storage type."""

    write_mode: Optional[str] = Field(None, description="overwrite or append")
    
    # For S3/GCS storage
    storage_type: Optional[str] = Field(None, description="s3, gcs, bigquery, etc.")
    storage_info: Optional[SchedulingLineageStorageInfo] = Field(None)
    access_details: Optional[Dict[str, Any]] = Field(None)
    external_system: Optional[Dict[str, Any]] = Field(None)

    model_config = ConfigDict(extra="allow")


class SchedulingLineageJobMeta(BaseModel):
    """Job metadata nested within metadata block."""

    logic_type: Optional[str] = Field(None, description="sql, python, etc.")
    is_deleted: Optional[bool] = Field(None)
    is_dag_active: Optional[bool] = Field(None)
    status: Optional[str] = Field(None, description="DEPLOYED, RUNNING, etc.")
    created_datetime: Optional[str] = Field(None)
    updated_datetime: Optional[str] = Field(None)
    service_code: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    schedule: Optional[SchedulingLineageSchedule] = Field(None)
    labels: Optional[Dict[str, Any]] = Field(None, description="layer, type, env, team, etc.")

    model_config = ConfigDict(extra="allow")


class SchedulingLineageMetadata(BaseModel):
    """Metadata wrapper for new API structure."""

    # MANDATORY: Handle both project_name and project (at least one required)
    project_name: Optional[str] = Field(None)

    # MANDATORY
    name: str = Field(..., description="Job name")
    owner: List[str] = Field(..., description="Array of owner IDs (at least one required)")

    @field_validator('name', 'project_name', mode='before')
    @classmethod
    def sanitize_metadata_strings(cls, v):
        """Strip whitespace from metadata strings."""
        if isinstance(v, str):
            return v.strip()
        return v
    
    job_meta: Optional[SchedulingLineageJobMeta] = Field(None)
    
    # Handle both target_meta and table_meta
    target_meta: Optional[SchedulingLineageTargetMeta] = Field(None)    
    
    # Encryption configs
    enc_configs: Optional[Dict[str, Any]] = Field(None, description="column_enc, file_enc, etc.")

    model_config = ConfigDict(extra="allow")

    @field_validator('owner', mode='before')
    @classmethod
    def normalize_owner(cls, v):
        """Normalize owner to always be a list."""
        if v is None:
            raise ValueError("owner is required")
        if isinstance(v, str):
            return [v]
        if isinstance(v, list) and len(v) == 0:
            raise ValueError("owner list cannot be empty")
        return v

    @field_validator('project_name', mode='after')
    @classmethod
    def validate_project(cls, v, info):
        """Ensure at least one of project_name or project is provided."""
        if v is None and info.data.get('project') is None:
            raise ValueError("Either project_name or project must be provided")
        return v

    def get_project(self) -> str:
        """Get project name from either field."""
        return self.project_name or getattr(self, "project", None) or "default-project"

    def get_target_meta(self) -> Optional[SchedulingLineageTargetMeta]:
        """Get target metadata from either field."""
        return self.target_meta 


class SchedulingLineage(BaseModel):
    """
    Canonical job payload returned by the Job Manager API.
    NEW FORMAT ONLY - no backward compatibility with old structure.
    """

    job_id: str = Field(..., description="Unique job identifier.")
    
    upstreams: List[SchedulingLineageDependency] = Field(default_factory=list)
    downstreams: List[SchedulingLineageDependency] = Field(default_factory=list)
    
    
    # MANDATORY: structured metadata
    metadata: SchedulingLineageMetadata = Field(..., description="Job metadata (required)")

    model_config = ConfigDict(extra="allow")

    @field_validator('job_id', mode='before')
    @classmethod
    def sanitize_job_id(cls, v):
        """Strip and validate job_id."""
        if isinstance(v, str):
            val = v.strip()
            if not val:
                raise ValueError("job_id cannot be empty")
            return val
        return v

    @field_validator('upstreams', 'downstreams', mode='after')
    @classmethod
    def filter_empty_dependencies(cls, v):
        """Filter out dependencies with empty names."""
        return [d for d in v if d.name]

    def get_name(self) -> str:
        """Get job name from metadata."""
        return self.metadata.name

    def get_type(self) -> Optional[str]:
        """Get job type from metadata labels."""
        if self.metadata.job_meta and self.metadata.job_meta.labels:
            return self.metadata.job_meta.labels.get("type")
        return None

    def get_status(self) -> Optional[str]:
        """Get job status from metadata."""
        if self.metadata.job_meta:
            return self.metadata.job_meta.status
        return None

    def get_schedule(self) -> Optional[SchedulingLineageSchedule]:
        """Get schedule from metadata."""
        if self.metadata.job_meta:
            return self.metadata.job_meta.schedule
        return None

    def get_owner(self) -> List[str]:
        """Get all owners."""
        return self.metadata.owner if self.metadata.owner else []

    def get_project(self) -> str:
        """Get project name from metadata."""
        return self.metadata.get_project()


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

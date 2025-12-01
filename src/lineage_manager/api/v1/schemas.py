from typing import List, Optional

from pydantic import BaseModel, Field

# class JobRegister(BaseModel):
#     """Schema for job registration requests."""


#     job_id: str = Field(..., description="Unique job identifier")
#     name: str = Field(..., description="Human-readable job name")
#     labels: dict = Field(..., description="Job labels as JSON object")
#     owner: Optional[str] = Field(None, description="Job owner")
#     write_mode: Optional[str] = Field(None, description="Write mode for the job")
#     destination_type: Optional[str] = Field(None, description="Type of destination")
#     destination_table: Optional[str] = Field(None, description="Destination table name")
#     trigger_tables: List[str] = Field(
#         default_factory=list, description="List of trigger tables"
#     )
#     reference_tables: List[str] = Field(
#         default_factory=list, description="List of reference tables"
#     )
#     run_status: Optional[str] = Field("RUN", description="Job run status (RUN/STOP)")
#     schedule: Optional[dict] = Field(None, description="Job schedule configuration")
#     destinations: Optional[list] = Field(
#         None, description="Job destinations configuration"
#     )
#     metadata: Optional[dict] = Field(
#         default_factory=dict, description="Additional job metadata"
#     )
class JobRegister(BaseModel):
    """Schema for job registration requests."""

    job_id: str = Field(..., description="Unique job identifier")
    name: str = Field(..., description="Human-readable job name")
    trigger_tables: list[str] = Field(
        default_factory=list, description="List of trigger tables"
    )
    reference_tables: list[str] = Field(
        default_factory=list, description="List of reference tables"
    )
    destination_tables: list[str] = Field(
        default_factory=list, description="List of destination tables"
    )
    metadata: dict = Field(default_factory=dict, description="Additional job metadata")


class JobUpdate(BaseModel):
    """Schema for job update requests."""

    name: Optional[str] = Field(None, description="Human-readable job name")
    labels: Optional[dict] = Field(None, description="Job labels as JSON object")
    owner: Optional[str] = Field(None, description="Job owner")
    write_mode: Optional[str] = Field(None, description="Write mode for the job")
    destination_type: Optional[str] = Field(None, description="Type of destination")
    destination_table: Optional[str] = Field(None, description="Destination table name")
    trigger_tables: Optional[List[str]] = Field(
        None, description="List of trigger tables"
    )
    reference_tables: Optional[List[str]] = Field(
        None, description="List of reference tables"
    )
    run_status: Optional[str] = Field(None, description="Job run status (RUN/STOP)")
    schedule: Optional[dict] = Field(None, description="Job schedule configuration")
    destinations: Optional[list] = Field(
        None, description="Job destinations configuration"
    )
    metadata: Optional[dict] = Field(None, description="Additional job metadata")


class JobResponse(BaseModel):
    """Schema for job response data."""

    id: str
    name: str
    labels: dict
    type: str = "job"
    service_type: str = "self-scheduling"
    status: str
    enabled: bool
    owner: Optional[str] = None
    write_mode: Optional[str] = None
    destination_type: Optional[str] = None
    destination_table: Optional[str] = None
    trigger_tables: List[str] = []
    reference_tables: List[str] = []
    metadata: Optional[dict] = None


class GraphResponse(BaseModel):
    """Schema for graph response data."""

    nodes: List[JobResponse]
    edges: List[dict]


class JobDependencyResponse(BaseModel):
    """Schema for job dependency response."""

    job_id: str
    descendants: List[dict]
    ancestors: List[dict]
    descendant_count: int
    ancestor_count: int


class GraphInitResponse(BaseModel):
    """Schema for graph initialization response."""

    status: str
    message: str
    job_nodes_created: int
    table_nodes_created: int
    total_nodes_created: int
    edges_created: int
    jobs_fetched: int

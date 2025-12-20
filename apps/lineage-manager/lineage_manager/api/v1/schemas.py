from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

class JobRegister(BaseModel):
    """Schema for job registration requests."""

    job_id: str = Field(..., description="Unique job identifier")
    name: str = Field(..., description="Human-readable job name")
    labels: dict = Field(default_factory=dict, description="Job labels as JSON object")
    owner: Optional[str] = Field(None, description="Job owner")
    write_mode: Optional[str] = Field(None, description="Write mode for the job")
    destination_types: List[str] = Field(
        default_factory=list, description="List of destination types"
    )
    destination_tables: List[str] = Field(
        default_factory=list, description="List of destination tables"
    )
    trigger_tables: List[str] = Field(
        default_factory=list, description="List of trigger tables"
    )
    reference_tables: List[str] = Field(
        default_factory=list, description="List of reference tables"
    )
    run_status: Optional[str] = Field("RUN", description="Job run status (RUN/STOP)")
    schedule: Optional[dict] = Field(None, description="Job schedule configuration")
    destinations: Optional[list] = Field(
        None, description="Job destinations configuration"
    )
    metadata: dict = Field(default_factory=dict, description="Additional job metadata")


class JobUpdate(BaseModel):
    """Schema for job update requests."""

    name: Optional[str] = Field(None, description="Human-readable job name")
    labels: Optional[dict] = Field(None, description="Job labels as JSON object")
    owner: Optional[str] = Field(None, description="Job owner")
    write_mode: Optional[str] = Field(None, description="Write mode for the job")
    destination_types: Optional[List[str]] = Field(None, description="List of destination types")
    destination_tables: Optional[List[str]] = Field(None, description="List of destination tables")
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
    destination_types: List[str] = []
    destination_tables: List[str] = []
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


class LineageDepthMetrics(BaseModel):
    upstream: int = Field(0, description="Max hops from root to the selected table")
    downstream: int = Field(0, description="Max hops from the table to any leaf")


class LineageMetrics(BaseModel):
    root_count: int
    leaf_count: int
    upstream_table_count: int
    downstream_table_count: int
    upstream_job_count: int
    downstream_job_count: int
    depth: LineageDepthMetrics


class LineageSection(BaseModel):
    root_tables: List[str] = Field(default_factory=list, description="Upstream roots")
    leaf_tables: List[str] = Field(default_factory=list, description="Downstream leaves")
    tables: List[str] = Field(default_factory=list, description="All tables in direction")
    jobs: List[str] = Field(default_factory=list, description="All jobs in direction")


class LineagePaths(BaseModel):
    preview: List[List[str]] = Field(default_factory=list, description="Short paths for panel preview")
    full: List[List[str]] = Field(default_factory=list, description="Full paths for drawer view")


class LineageCacheMeta(BaseModel):
    cached: bool
    expires_in_sec: Optional[int] = Field(
        None, description="Seconds until cache entry expires (if applicable)"
    )


class TableLineageSummaryResponse(BaseModel):
    status: str
    table: str
    metrics: LineageMetrics
    upstream: LineageSection
    downstream: LineageSection
    paths: LineagePaths
    timestamp: str
    cache: LineageCacheMeta


# New schemas for batch job sync
class JobSyncRequest(BaseModel):
    """Single job sync request."""
    type: str = Field(..., description="Job scheduling type (req-type, self-type)")
    job_id: str = Field(..., description="Job ID to sync")


class BatchJobSyncRequest(BaseModel):
    """Batch job sync request."""
    jobs: List[JobSyncRequest] = Field(..., description="List of jobs to sync")


class JobUpdateRequest(BaseModel):
    status: Optional[str] = None
    enabled: Optional[bool] = None
    trigger_tables: Optional[List[str]] = None


# New schemas for grouped node details
class NodeTableInfo(BaseModel):
    id: str
    type: str
    write_mode: Optional[str] = None
    storage_type: Optional[str] = None

class NodeJobInfo(BaseModel):
    job_id: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    run_status: Optional[str] = None
    cron: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    lifecycle_status: Optional[str] = None

class NodeDetails(BaseModel):
    table_info: NodeTableInfo
    job_info: NodeJobInfo

class BatchNodeDetailsResponse(BaseModel):
    status: str
    results: dict[str, NodeDetails]


# ============================================================================
# New Graph API Schemas for Mermaid Viewer (Cytoscape Migration)
# ============================================================================

class GraphNode(BaseModel):
    """Node in the lineage graph (job or table)."""
    
    id: str = Field(..., description="Node identifier: 'job:xxx' or 'table:xxx'")
    type: Literal["job", "table"] = Field(..., description="Node type")
    label: str = Field(..., description="Display label")
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional node properties (owner, status, etc.)"
    )


class GraphEdge(BaseModel):
    """Edge in the lineage graph."""
    
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    type: str = Field(..., description="Edge type: writes, reads, depends_on")
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional edge properties (dependency_type, etc.)"
    )


class GraphMetadata(BaseModel):
    """Metadata about the graph response."""
    
    total_nodes: int = Field(..., description="Total number of nodes in response")
    depth: int = Field(..., description="Depth of graph traversal")
    truncated: bool = Field(
        default=False,
        description="Whether the graph was truncated due to size limits"
    )
    max_nodes_reached: bool = Field(
        default=False,
        description="Whether maximum node limit was reached"
    )


class MermaidGraphResponse(BaseModel):
    """Graph response optimized for Mermaid rendering."""
    
    nodes: List[GraphNode] = Field(..., description="List of graph nodes")
    edges: List[GraphEdge] = Field(..., description="List of graph edges")
    metadata: GraphMetadata = Field(..., description="Graph metadata")

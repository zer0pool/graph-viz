from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


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
    leaf_tables: List[str] = Field(
        default_factory=list, description="Downstream leaves"
    )
    tables: List[str] = Field(
        default_factory=list, description="All tables in direction"
    )
    jobs: List[str] = Field(default_factory=list, description="All jobs in direction")


class LineagePaths(BaseModel):
    preview: List[List[str]] = Field(
        default_factory=list, description="Short paths for panel preview"
    )
    full: List[List[str]] = Field(
        default_factory=list, description="Full paths for drawer view"
    )


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
    owners: List[str] = []
    status: Optional[str] = None
    run_status: Optional[str] = None
    cron: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    lifecycle_status: Optional[str] = None
    job_meta: Optional[Dict[str, Any]] = None  # Full structured metadata
    labels: Optional[Dict[str, Any]] = None
    type: Optional[str] = None


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
        description="Additional node properties (owner, status, etc.)",
    )


class GraphEdge(BaseModel):
    """Edge in the lineage graph."""

    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    type: str = Field(..., description="Edge type: writes, reads, depends_on")
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional edge properties (dependency_type, etc.)",
    )


class GraphMetadata(BaseModel):
    """Metadata about the graph response."""

    total_nodes: int = Field(..., description="Total number of nodes in response")
    depth: int = Field(..., description="Depth of graph traversal")
    truncated: bool = Field(
        default=False, description="Whether the graph was truncated due to size limits"
    )
    max_nodes_reached: bool = Field(
        default=False, description="Whether maximum node limit was reached"
    )


class MermaidGraphResponse(BaseModel):
    """Graph response optimized for Mermaid rendering."""

    nodes: List[GraphNode] = Field(..., description="List of graph nodes")
    edges: List[GraphEdge] = Field(..., description="List of graph edges")
    metadata: GraphMetadata = Field(..., description="Graph metadata")


# ============================================================================
# Audit / Operations Schemas
# ============================================================================


class AuditEvent(BaseModel):
    id: str
    description: str
    status: Literal["SUCCESS", "FAILED", "TIMEOUT"]
    timestamp: str


class AuditCommand(BaseModel):
    id: str
    timestamp: str
    type: str = "COMMAND"
    summary: str
    actor: str
    status: Literal["SUCCESS", "PARTIAL", "FAILED"]
    incidentId: Optional[str] = None
    relatedInfo: Optional[str] = None
    events: List[AuditEvent] = []


# ============================================================================
# User Management Schemas
# ============================================================================


class UserRole(str):
    PM = "PM"
    OPERATOR = "OPERATOR"
    DEVELOPER = "DEVELOPER"


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    roles: List[str]
    department: str
    lastActive: str


# ============================================================================
# Job Lineage Schemas (New)
# ============================================================================


class LineageNode(BaseModel):
    """Refined node model for lineage response."""
    id: str = Field(..., description="Canonical ID (e.g., job:123, table:456)")
    type: str = Field(..., description="'job' or 'table'")
    name: str = Field(..., description="Display name")
    
    # Optional fields depending on type
    job_id: Optional[str] = None
    full_name: Optional[str] = None
    owners: List[str] = []
    status: Optional[str] = None
    enabled: Optional[bool] = None


class LineageEdge(BaseModel):
    """Refined edge model for lineage response."""
    source: str
    target: str
    io: str = Field(..., description="'input' or 'output'")


class LineageDirection(BaseModel):
    """Container for nodes and edges in a specific direction."""
    nodes: List[LineageNode]
    edges: List[LineageEdge]


# ============================================================================
# Job Lineage Hybrid Schemas (New)
# ============================================================================

class InputTableInfo(BaseModel):
    """Schema for Upstream Input Table."""
    id: str
    name: str
    storage_type: Optional[str] = "BQ"
    read_mode: Optional[str] = "FULL"
    freshness: Optional[str] = None  # e.g. "02:01"
    quality_status: Optional[str] = "PASS"
    row_count: Optional[int] = None
    owner: Optional[str] = None
    criticality: Optional[str] = "LOW"


class OutputTableInfo(BaseModel):
    """Schema for Downstream Output Table."""
    id: str
    name: str
    storage_type: Optional[str] = "BQ"
    write_mode: Optional[str] = "APPEND"
    recent_volume: Optional[int] = None  # bytes or rows
    consumer_count: int = 0
    sla_status: Optional[str] = "MET"


class LineageGraphData(BaseModel):
    """Container for visualization graph data."""
    nodes: List[LineageNode]
    edges: List[LineageEdge]


class JobLineageHybridResponse(BaseModel):
    """Hybrid response for Lineage Page (List + Graph)."""
    job_id: str
    inputs: List[InputTableInfo]
    outputs: List[OutputTableInfo]
    graph: LineageGraphData



# ============================================================================
# Job Health Schemas (New)
# ============================================================================


class FreshnessInfo(BaseModel):
    last_updated: str
    sla: str
    delay: Optional[int] = None


class LastRunInfo(BaseModel):
    result: str
    duration: str
    ended_at: str


class ExecutionInfo(BaseModel):
    mode: str
    partition: Optional[str] = None


class JobHealthData(BaseModel):
    """Inner health data object."""
    freshness: FreshnessInfo
    last_run: LastRunInfo
    execution: ExecutionInfo


class JobHealthResponse(BaseModel):
    """Top-level response for job health."""
    job_id: str
    updated_at: str
    health: JobHealthData



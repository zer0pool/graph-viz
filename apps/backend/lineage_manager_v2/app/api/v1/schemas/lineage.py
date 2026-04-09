from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class LineageEdge(BaseModel):
    source_type: str  # 'job', 'data'
    source_name: str
    target_type: str
    target_name: str
    edge_type: str = "lineage"
    properties: Dict[str, Any] = {}


class LineageRegistration(BaseModel):
    edges: List[LineageEdge]


class NodeSchema(BaseModel):
    id: int
    type: str  # 'job', 'data'
    name: str  # fqn or job_id
    properties: Dict[str, Any] = {}


class EdgeSchema(BaseModel):
    id: int
    source: int
    target: int
    type: str
    properties: Dict[str, Any] = {}


class GraphResponse(BaseModel):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]


class InputTableInfo(BaseModel):
    id: str
    name: str
    storage_type: Optional[str] = None
    read_mode: Optional[str] = None
    freshness: Optional[str] = None
    quality_status: Optional[str] = None
    row_count: Optional[int] = None
    owner: Optional[str] = None
    criticality: Optional[str] = None


class OutputTableInfo(BaseModel):
    id: str
    name: str
    storage_type: Optional[str] = None
    write_mode: Optional[str] = None
    recent_volume: Optional[int] = None
    consumer_count: int = 0
    sla_status: Optional[str] = None


class LineageNode(BaseModel):
    id: str
    type: str
    name: str
    job_id: Optional[str] = None
    full_name: Optional[str] = None
    owners: List[str] = []
    status: Optional[str] = None
    enabled: Optional[bool] = None


class LineageGraphEdge(BaseModel):
    source: str
    target: str
    io: Optional[str] = None


class LineageGraphData(BaseModel):
    nodes: List[LineageNode]
    edges: List[LineageGraphEdge]


class JobLineageHybridResponse(BaseModel):
    job_id: str
    inputs: List[InputTableInfo]
    outputs: List[OutputTableInfo]
    graph: LineageGraphData


class MermaidNode(BaseModel):
    id: str
    type: str
    label: str
    properties: Dict[str, Any] = {}


class MermaidEdge(BaseModel):
    id: int
    source: str
    target: str
    type: str
    properties: Dict[str, Any] = {}


class MermaidMetadata(BaseModel):
    total_nodes: int
    depth: int
    truncated: bool


class MermaidGraphResponse(BaseModel):
    nodes: List[MermaidNode]
    edges: List[MermaidEdge]
    metadata: MermaidMetadata


# Impact Analysis Schemas

class ImpactDownstreamEntry(BaseModel):
    depth: int
    table: str
    writer_jobs: List[str] = []
    description: Optional[str] = None


class ImpactAnalysisSummary(BaseModel):
    total_depth: int
    total_downstream_tables: int
    total_writer_jobs: int


class ImpactAnalysisResponse(BaseModel):
    base_table: str
    downstream: List[ImpactDownstreamEntry]
    summary: ImpactAnalysisSummary

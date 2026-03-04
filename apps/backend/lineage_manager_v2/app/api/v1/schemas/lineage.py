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

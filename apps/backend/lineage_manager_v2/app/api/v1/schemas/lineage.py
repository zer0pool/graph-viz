from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional


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

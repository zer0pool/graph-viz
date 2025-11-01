from pydantic import BaseModel
from typing import List, Optional, Literal

class GraphNode(BaseModel):
    id: str
    label: str
    type: Literal["job", "table"]
    status: Literal["success", "failure", "pending"] = "pending"
    enabled: bool = True
    meta: Optional[dict] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

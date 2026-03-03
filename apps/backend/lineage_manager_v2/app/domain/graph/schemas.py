from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# --- Node Schemas ---
class GraphNodeBase(BaseModel):
    node_type: str
    name: str


class GraphNodeCreate(GraphNodeBase):
    pass


class GraphNodeRead(GraphNodeBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Edge Schemas ---
class GraphEdgeBase(BaseModel):
    source_id: int
    target_id: int
    edge_type: str


class GraphEdgeCreate(GraphEdgeBase):
    pass


class GraphEdgeRead(GraphEdgeBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Lineage Response (for Basic Traversal) ---
class LineageResponse(BaseModel):
    nodes: List[GraphNodeRead]
    edges: List[GraphEdgeRead]

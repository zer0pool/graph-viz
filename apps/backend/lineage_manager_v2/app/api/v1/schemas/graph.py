from pydantic import BaseModel
from typing import Optional, Any


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None


class GraphInitResponse(BaseModel):
    status: str
    task_id: str
    message: str


class CommandResponse(BaseModel):
    status: str
    task_id: Optional[str] = None
    message: Optional[str] = None


class GraphMeta(BaseModel):
    nodes: int
    edges: int
    closures: int


class GraphStatsResponse(BaseModel):
    projects: int
    jobs: int
    users: int
    tables: int
    graph: GraphMeta

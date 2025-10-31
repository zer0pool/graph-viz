from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class NodeStatus(str, Enum):
    """Job node status in the dependency graph"""
    PENDING = "pending"
    SUCCESS = "success"
    FAILURE = "failure"

class Node(BaseModel):
    """
    Represents a job node in the dependency graph
    """
    id: str = Field(..., description="Unique identifier for the job")
    label: str = Field(..., description="Display name or description of the job")
    status: NodeStatus = Field(
        default=NodeStatus.PENDING,
        description="Current status of the job"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional job-specific information"
    )

    class Config:
        schema_extra = {
            "example": {
                "id": "job_123",
                "label": "Data Processing Task",
                "status": "pending",
                "metadata": {
                    "created_at": "2025-11-01T10:00:00Z",
                    "owner": "data_team"
                }
            }
        }

class Edge(BaseModel):
    """
    Represents a dependency relationship between two jobs
    """
    source: str = Field(..., description="ID of the source job")
    target: str = Field(..., description="ID of the target job")
    label: Optional[str] = Field(None, description="Type or description of the dependency")

    class Config:
        schema_extra = {
            "example": {
                "source": "job_123",
                "target": "job_124",
                "label": "depends_on"
            }
        }

class Graph(BaseModel):
    """
    Represents a complete dependency graph structure
    """
    nodes: List[Node] = Field(..., description="List of job nodes in the graph")
    edges: List[Edge] = Field(..., description="List of dependencies between jobs")
    meta: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional graph-level metadata"
    )

    class Config:
        schema_extra = {
            "example": {
                "nodes": [
                    {
                        "id": "job_123",
                        "label": "Data Processing",
                        "status": "success"
                    },
                    {
                        "id": "job_124",
                        "label": "Model Training",
                        "status": "pending"
                    }
                ],
                "edges": [
                    {
                        "source": "job_123",
                        "target": "job_124",
                        "label": "data_dependency"
                    }
                ],
                "meta": {
                    "graph_type": "workflow",
                    "created_at": "2025-11-01T10:00:00Z"
                }
            }
        }

class GraphSync(BaseModel):
    """
    Response model for job data synchronization
    """
    job_id: int = Field(..., description="ID of the synchronized job")
    status: str = Field(..., description="Status of the synchronization operation")
    message: str = Field(..., description="Detailed message about the synchronization result")

    class Config:
        schema_extra = {
            "example": {
                "job_id": 123,
                "status": "success",
                "message": "Job data synchronized successfully"
            }
        }
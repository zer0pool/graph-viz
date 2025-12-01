from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphEdge(Base):
    """
    Direct relationship (Edge) between nodes in a graph
    Represents various relationships such as Job-to-Job, Table-to-Table, etc.
    """

    __tablename__ = "graph_edge"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Start and end node IDs of the Edge (Integer-based for performance)
    source_node_id = Column(Integer, nullable=False)
    target_node_id = Column(Integer, nullable=False)

    # Source node type ('job' or 'table')
    source_node_type = Column(String(10), nullable=False)

    # Target node type ('job' or 'table')
    target_node_type = Column(String(10), nullable=False)

    # Relationship type ('dependency', 'data_flow', 'triggers', etc.)
    edge_type = Column(String(50), nullable=False)

    # Label information for the relationship
    labels = Column(JSON, nullable=True)

    # Activation status
    is_trigger_on = Column(Boolean, default=True)

    # Readability fields for human-readable identification
    source_job_id = Column(String(255), nullable=True)  # Human-readable job ID
    source_table_name = Column(String(255), nullable=True)  # Human-readable table name
    target_job_id = Column(String(255), nullable=True)  # Human-readable job ID
    target_table_name = Column(String(255), nullable=True)  # Human-readable table name

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "source_node_id", "target_node_id", "edge_type", name="uq_edge_relation"
        ),
    )

    def __repr__(self):
        return (
            f"<GraphEdge(source={self.source_node_type}:{self.source_node_id}, "
            f"target={self.target_node_type}:{self.target_node_id}, type={self.edge_type})>"
        )

from sqlalchemy import JSON, Column, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphClosure(Base):
    """
    Closure table for efficiently querying transitive relationships in the graph
    Stores all path relationships between ancestor and descendant nodes
    """

    __tablename__ = "graph_closure"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Ancestor node ID (Integer-based for performance)
    ancestor_id = Column(Integer, nullable=False)

    # Descendant node ID (Integer-based for performance)
    descendant_id = Column(Integer, nullable=False)

    # Ancestor node type
    ancestor_type = Column(String(10), nullable=False)

    # Descendant node type
    descendant_type = Column(String(10), nullable=False)

    # Depth (distance from ancestor)
    depth = Column(Integer, nullable=False, default=0)

    # Path information (optional: metadata for path tracing)
    path_info = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "ancestor_id", "descendant_id", "depth", name="uq_closure_path"
        ),
    )

    def __repr__(self):
        return (
            f"<GraphClosure(ancestor={self.ancestor_type}:{self.ancestor_id}, "
            f"descendant={self.descendant_type}:{self.descendant_id}, depth={self.depth})>"
        )

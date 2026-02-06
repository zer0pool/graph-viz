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
from sqlalchemy.ext.mutable import MutableDict

from .base import Base


class GraphEdge(Base):
    """Simplified edge between two graph nodes."""

    __tablename__ = "graph_edge"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_node_id = Column(Integer, nullable=False)
    target_node_id = Column(Integer, nullable=False)
    edge_type = Column(String(20), nullable=False)
    trigger = Column(Boolean, nullable=True, default=False)
    properties = Column(MutableDict.as_mutable(JSON), nullable=True, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    @property
    def is_trigger(self) -> bool:
        """Compatibility property for trigger checks."""
        return bool(self.trigger)

    __table_args__ = (
        UniqueConstraint(
            "source_node_id",
            "target_node_id",
            "edge_type",
            name="uq_graph_edge_source_target_type",
        ),
    )

    def __repr__(self):
        return f"<GraphEdge(src={self.source_node_id}, dst={self.target_node_id}, type={self.edge_type})>"

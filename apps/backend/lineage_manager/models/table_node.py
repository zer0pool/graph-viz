from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    JSON,
    String,
    UniqueConstraint,
    Integer,
    func,
)
from sqlalchemy.orm import relationship

from .base import Base


class TableNode(Base):
    """Table specific node data."""

    __tablename__ = "table_node"

    node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True
    )

    # BigQuery identification
    dataset = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)

    # Additional metadata
    properties = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    node = relationship("GraphNode", backref="table_node")

    __table_args__ = (
        UniqueConstraint("dataset", "table_name", name="uq_dataset_table"),
    )

    def __repr__(self):
        return f"<TableNode(node_id={self.node_id}, dataset={self.dataset}, table={self.table_name})>"

from sqlalchemy import Column, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from .base import Base


class DataNode(Base):
    """Data asset specific node data (BigQuery tables, S3 files, etc)."""

    __tablename__ = "data_node"

    node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True
    )

    # Unique identifier for the data asset (FQN)
    data_id = Column(String(500), nullable=False, unique=True, index=True)
    
    # Type of data asset (BIGQUERY, S3, GCS, etc.)
    data_type = Column(String(50), nullable=False)

    # Structured metadata (dataset, bucket, schema, etc.)
    data_info = Column(JSON, nullable=True)

    # Relationship
    node = relationship("GraphNode", backref="data_node")

    def __repr__(self):
        return f"<DataNode(node_id={self.node_id}, data_id={self.data_id}, type={self.data_type})>"

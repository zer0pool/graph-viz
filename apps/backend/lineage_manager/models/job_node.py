from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Integer, func
from sqlalchemy.orm import relationship

from .base import Base


class JobNode(Base):
    """Job specific node data."""

    __tablename__ = "job_node"

    node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True
    )

    # Unique identifier for the job ({project}.{name})
    job_id = Column(String(500), nullable=False, unique=True, index=True)
    
    # Search fields
    project_id = Column(String(100), nullable=False, index=True)
    
    # Owners list (JSON array)
    owners = Column(JSON, nullable=True)

    # Additional metadata (includes create_datetime, update_datetime, etc.)
    properties = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    node = relationship("GraphNode", backref="job_node")

    def __repr__(self):
        return f"<JobNode(node_id={self.node_id}, job_id={self.job_id}, project={self.project_id})>"

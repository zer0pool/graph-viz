from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Integer, func
from sqlalchemy.orm import relationship

from .base import Base


class JobNode(Base):
    """Job specific node data."""
    
    __tablename__ = "job_node"
    
    node_id = Column(Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True)
    
    # Search fields (indexed)
    project_id = Column(String(100), nullable=False, index=True)
    owner_id = Column(String(100), nullable=False, index=True)
    
    # Additional metadata
    properties = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship
    node = relationship("GraphNode", backref="job_node")
    
    def __repr__(self):
        return f"<JobNode(node_id={self.node_id}, project={self.project_id}, owner={self.owner_id})>"

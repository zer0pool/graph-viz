from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.orm import relationship, backref
from app.db.base import Base

class Job(Base):
    """
    Heavy Leaf Node for Jobs.
    Contains all descriptive metadata.
    """
    __tablename__ = "job"

    # One-to-One relationship with GraphNode
    node_id = Column(Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True)
    
    # Metadata that was previously json
    owner_id = Column(String(100), index=True, nullable=True)
    project_id = Column(String(100), index=True, nullable=True)
    
    # Scheduling
    schedule_interval = Column(String(100), nullable=True) # Cron or @daily
    is_active = Column(Boolean, default=True)
    
    # Rich Description
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True) # ["prod", "pii"]
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    # Use viewonly=True if you want to enforce graph_node modification only via Graph Service? 
    # taking standard approach for now.
    node = relationship("app.domain.graph.models.GraphNode", backref=backref("job", uselist=False))

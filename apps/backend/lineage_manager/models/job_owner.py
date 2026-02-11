from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship

from .base import Base
from .types import LowerCaseString


class JobOwner(Base):
    """
    Many-to-many relationship between Jobs (GraphNode) and Users (UserAccount).
    Allows efficient indexing of jobs by owner.
    """

    __tablename__ = "job_owner"

    job_id = Column(
        Integer,
        ForeignKey("graph_node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        LowerCaseString(100),
        ForeignKey("user_account.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships for convenience
    job = relationship("GraphNode", backref="owner_records")
    user = relationship("UserAccount", backref="owned_job_records")

    def __repr__(self):
        return f"<JobOwner(job_id={self.job_id}, user_id={self.user_id})>"

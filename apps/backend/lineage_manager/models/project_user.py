from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship

from .base import Base


class ProjectUser(Base):
    """Project-User relationship for membership management."""
    
    __tablename__ = "project_user"
    
    project_id = Column(String(100), ForeignKey("project.project_id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(100), ForeignKey("user_account.user_id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(50), nullable=True)  # OWNER, MEMBER, VIEWER
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", backref="members")
    user = relationship("UserAccount", backref="projects")
    
    def __repr__(self):
        return f"<ProjectUser(project={self.project_id}, user={self.user_id}, role={self.role})>"

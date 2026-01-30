from sqlalchemy import Column, DateTime, String, Text, func
from .base import Base


class Project(Base):
    """Project information model."""

    __tablename__ = "project"

    project_id = Column(String(100), primary_key=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    business_unit = Column(String(100), nullable=True, index=True)
    status = Column(String(20), server_default="ACTIVE", nullable=True, index=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<Project(project_id={self.project_id}, name={self.display_name})>"

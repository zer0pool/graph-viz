from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.infrastructure.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Master/Detail link
    parent_id = Column(Integer, nullable=True, index=True)

    # Who did it?
    user_email = Column(String(255), nullable=False, index=True)

    # What did they do?
    action = Column(String(50), nullable=False)  # PAUSE_JOB, RESUME_JOB
    target_type = Column(String(50), nullable=False)  # JOB, SYSTEM
    target_id = Column(String(255), nullable=True)  # job_id or string identifier (nullable for Master)
    task_name = Column(String(100), nullable=True)  # Human-readable target name

    # Details
    payload = Column(JSON, nullable=True)  # Command arguments
    status = Column(String(20), default="SUCCESS")
    error_message = Column(Text, nullable=True)

    # Master Stats
    total_count = Column(Integer, default=0, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    fail_count = Column(Integer, default=0, nullable=False)
    duration = Column(Float, nullable=True)  # Store in seconds with one decimal place

    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)

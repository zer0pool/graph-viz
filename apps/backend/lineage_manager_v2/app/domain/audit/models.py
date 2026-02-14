from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, func
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Who did it?
    user_email = Column(String(255), nullable=False, index=True)

    # What did they do?
    action = Column(String(50), nullable=False)  # PAUSE_JOB, RESUME_JOB
    target_type = Column(String(50), nullable=False)  # JOB, SYSTEM
    target_id = Column(String(255), nullable=False)  # job_id or string identifier

    # Details
    payload = Column(JSON, nullable=True)  # Command arguments
    status = Column(String(20), default="SUCCESS")
    error_message = Column(Text, nullable=True)

    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)

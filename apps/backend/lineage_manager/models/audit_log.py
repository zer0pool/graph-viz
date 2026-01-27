from sqlalchemy import Column, DateTime, Integer, String, Text, func
from .base import Base


class AuditLog(Base):
    """Audit log for tracking command executions."""
    
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Command Details
    command_type = Column(String(100), nullable=False, index=True) # e.g., PAUSE_JOB, SEND_EMAIL
    target_id = Column(String(255), nullable=True, index=True)     # e.g., job_id, user_id
    payload = Column(Text, nullable=True)                          # JSON string of parameters
    
    # Execution Context
    performed_by = Column(String(100), nullable=False, index=True) # User ID / Email
    status = Column(String(50), nullable=False)                    # SUCCESS, FAILURE
    error_message = Column(Text, nullable=True)
    
    visited_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, cmd={self.command_type}, user={self.performed_by})>"

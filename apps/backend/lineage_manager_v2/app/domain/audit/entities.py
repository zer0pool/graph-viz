from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class AuditLog:
    command_type: str
    performed_by: str
    status: str
    target_id: Optional[str] = None
    target_type: str = "SYSTEM"  # Adding target_type based on model
    action: str = "UNKNOWN"    # Adding action based on model
    user_email: str = "system" # Adding user_email based on model
    
    # Master/Detail link
    parent_id: Optional[int] = None
    task_name: Optional[str] = None
    
    # Master Stats
    total_count: int = 0
    success_count: int = 0
    fail_count: int = 0
    duration: Optional[float] = None
    
    payload: Optional[str] = None
    error_message: Optional[str] = None
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.now) # Model has timestamp instead of visited_at

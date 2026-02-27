from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class AuditLog:
    command_type: str
    performed_by: str
    status: str
    target_id: Optional[str] = None
    payload: Optional[str] = None
    error_message: Optional[str] = None
    id: Optional[int] = None
    visited_at: datetime = field(default_factory=datetime.now)

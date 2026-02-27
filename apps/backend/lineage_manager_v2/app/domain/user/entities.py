from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Any


@dataclass
class User:
    user_id: str
    sub: str
    login_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    roles: List[str] = field(default_factory=list)
    department: Optional[str] = None
    status: str = "ACTIVE"
    last_login_at: Optional[datetime] = None
    id: Optional[int] = None  # DB internal id
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

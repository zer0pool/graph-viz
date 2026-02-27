from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Project:
    project_id: str
    display_name: str
    description: Optional[str] = None
    business_unit: Optional[str] = None
    status: str = "ACTIVE"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

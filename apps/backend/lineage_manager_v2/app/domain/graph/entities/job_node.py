from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


@dataclass
class JobNode:
    """Represents a Job as a node in the lineage graph."""

    name: str
    project_id: str
    id: Optional[int] = None
    job_id: Optional[str] = None  # Business key (project.name)
    owners: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.job_id:
            self.job_id = (
                self.properties.get("job_id") or f"{self.project_id}.{self.name}"
            )

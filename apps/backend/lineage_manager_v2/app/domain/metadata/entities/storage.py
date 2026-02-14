from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any


@dataclass
class StorageMetadata:
    """Rich metadata for a Storage resource (S3, GCS, etc)."""

    id: int  # Maps to graph_node.id
    project_id: str
    path: str
    storage_type: str  # 'S3', 'GCS'
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

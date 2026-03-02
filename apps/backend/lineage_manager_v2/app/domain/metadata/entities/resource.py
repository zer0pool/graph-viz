from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class ResourceMetadata:
    """Rich metadata for a Data Resource (Table, Storage, etc.)."""

    id: int  # Maps to graph_node.id
    project_id: str
    fqn: str
    data_type: str = "BIGQUERY"  # e.g. 'BIGQUERY', 'S3', 'TABLE', 'STORAGE'
    schema_info: Dict[str, Any] = field(default_factory=dict)
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Note: TableMetadata is linked to a DataNode in the Graph domain via 'id'

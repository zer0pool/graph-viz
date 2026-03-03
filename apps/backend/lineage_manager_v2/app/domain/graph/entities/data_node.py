from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from app.domain.graph.value_objects.data_source_type import DataSourceType


@dataclass
class DataNode:
    """Represents a Data source (Table, Storage, Topic) as a node in the lineage graph."""

    id: Optional[int]
    data_id: str  # Business key (FQN or Path)
    source_type: DataSourceType
    project_id: str
    properties: Dict[str, Any] = field(default_factory=dict)

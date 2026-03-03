from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class Edge:
    """Represents a relationship (lineage or trigger) between nodes in the graph."""

    source_node_id: int
    target_node_id: int
    edge_type: str  # 'dependency', 'produces', 'consumes', 'trigger'
    trigger: bool = False
    properties: Dict[str, Any] = field(default_factory=dict)
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

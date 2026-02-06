import logging
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from lineage_manager.models.graph_node import GraphNode
from lineage_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class GraphNodeRepository(BaseRepository):
    """Generic repository for GraphNode operations."""

    def __init__(self, db: Session):
        super().__init__(db, GraphNode)

    def get_by_names(self, node_ids: List[str]) -> List[GraphNode]:
        """Fetch multiple nodes by their unique names (names)."""
        if not node_ids:
            return []
        
        stmt = select(GraphNode).where(GraphNode.name.in_(node_ids))
        return self.db.execute(stmt).scalars().all()

    def get_by_id(self, node_id: int) -> GraphNode | None:
        """Fetch a node by its database ID."""
        stmt = select(GraphNode).where(GraphNode.id == node_id)
        return self.db.execute(stmt).scalar_one_or_none()

from sqlalchemy import insert, select, text

from lineage_manager.models import GraphClosure, GraphNode
from lineage_manager.repositories.base_repository import BaseRepository


class ClosureRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_closure")

    def add_direct(self, ancestor_id: int, descendant_id: int):
        """Add direct relationship (depth=1)"""
        self.db.execute(
            insert(GraphClosure)
            .values(
                ancestor_id=ancestor_id,
                descendant_id=descendant_id,
                depth=1,
            )
            .prefix_with("IGNORE")
        )

    def expand_closure(self, ancestor_id: int, descendant_id: int):
        """Expand closure transitivity"""
        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT c.ancestor_id, :v, c.depth + 1
            FROM graph_closure c WHERE c.descendant_id = :u
        """
            ),
            {"u": ancestor_id, "v": descendant_id},
        )

        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT :u, c.descendant_id, c.depth + 1
            FROM graph_closure c WHERE c.ancestor_id = :v
        """
            ),
            {"u": ancestor_id, "v": descendant_id},
        )

    def get_upstream_nodes(
        self, node_id: int, node_type: str = None, max_depth: int = None
    ):
        """Get all upstream nodes from closure table."""
        query = (
            select(
                GraphNode.id,
                GraphNode.name,
                GraphNode.node_type,
                GraphClosure.depth,
            )
            .select_from(GraphClosure)
            .join(GraphNode, GraphNode.id == GraphClosure.ancestor_id)
            .where(GraphClosure.descendant_id == node_id)
        )

        if node_type:
            query = query.where(GraphNode.node_type == node_type)

        if max_depth:
            query = query.where(GraphClosure.depth <= max_depth)

        query = query.order_by(GraphClosure.depth.asc())

        result = self.db.execute(query).fetchall()
        return [
            {
                "id": row.id,
                "full_name": row.name,
                "type": row.node_type,
                "depth": row.depth,
            }
            for row in result
        ]

    def get_downstream_nodes(
        self, node_id: int, node_type: str = None, max_depth: int = None
    ):
        """Get all downstream nodes from closure table."""
        query = (
            select(
                GraphNode.id,
                GraphNode.name,
                GraphNode.node_type,
                GraphClosure.depth,
            )
            .select_from(GraphClosure)
            .join(GraphNode, GraphNode.id == GraphClosure.descendant_id)
            .where(GraphClosure.ancestor_id == node_id)
        )

        if node_type:
            query = query.where(GraphNode.node_type == node_type)

        if max_depth:
            query = query.where(GraphClosure.depth <= max_depth)

        query = query.order_by(GraphClosure.depth.asc())

        result = self.db.execute(query).fetchall()
        return [
            {
                "id": row.id,
                "full_name": row.name,
                "type": row.node_type,
                "depth": row.depth,
            }
            for row in result
        ]

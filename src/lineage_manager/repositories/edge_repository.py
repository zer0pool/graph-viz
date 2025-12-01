from sqlalchemy import insert, select

from lineage_manager.models import GraphEdge, GraphJobNode, GraphTableNode
from lineage_manager.repositories.base_repository import BaseRepository


class EdgeRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_edge")

    def add(
        self,
        source_id: int,
        target_id: int,
        source_type: str,
        target_type: str,
        edge_type: str,
    ):
        """Add edge between nodes with readability fields"""
        # Get human-readable names for source
        source_job_id = None
        source_table_name = None
        if source_type == "job":
            source_job_id = self.db.execute(
                select(GraphJobNode.job_id).where(GraphJobNode.id == source_id)
            ).scalar()
        elif source_type == "table":
            source_table_name = self.db.execute(
                select(GraphTableNode.full_name).where(GraphTableNode.id == source_id)
            ).scalar()

        # Get human-readable names for target
        target_job_id = None
        target_table_name = None
        if target_type == "job":
            target_job_id = self.db.execute(
                select(GraphJobNode.job_id).where(GraphJobNode.id == target_id)
            ).scalar()
        elif target_type == "table":
            target_table_name = self.db.execute(
                select(GraphTableNode.full_name).where(GraphTableNode.id == target_id)
            ).scalar()

        self.db.execute(
            insert(GraphEdge)
            .values(
                source_node_id=source_id,
                target_node_id=target_id,
                source_node_type=source_type,
                target_node_type=target_type,
                edge_type=edge_type,
                source_job_id=source_job_id,
                source_table_name=source_table_name,
                target_job_id=target_job_id,
                target_table_name=target_table_name,
                labels=[{"relationship_type": edge_type}],
                is_trigger_on=True,
            )
            .prefix_with("IGNORE")
        )

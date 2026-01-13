import logging

from sqlalchemy import insert, update

from lineage_manager.models import GraphEdge
from lineage_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class GraphEdgeRepository(BaseRepository):
    """Repository wrapper around graph_edge table."""

    def __init__(self, db):
        super().__init__(db, "graph_edge")

    def add(
        self,
        source_id: int,
        target_id: int,
        source_type: str,
        target_type: str,
        edge_type: str,
        dependency_type: str | None = None,
        properties: dict | None = None,
    ):
        logger.debug(
            "Adding edge %s:%s -> %s:%s (%s)",
            source_type,
            source_id,
            target_type,
            target_id,
            edge_type,
        )
        self.db.execute(
            insert(GraphEdge)
            .values(
                source_node_id=source_id,
                target_node_id=target_id,
                edge_type=edge_type,
                dependency_type=dependency_type,
                properties=properties or {},
            )
            .prefix_with("IGNORE")
        )

    def create_job_table_edge(
        self,
        job_id: int,
        table_id: int,
        io_type: str,
        dependency_type: str | None = None,
    ):
        """Create a read/write edge between job and table nodes."""
        if io_type == "input":
            self.add(
                source_id=table_id,
                target_id=job_id,
                source_type="table",
                target_type="job",
                edge_type="read",
                dependency_type=dependency_type,
                properties={"io_type": "input"},
            )
        else:
            self.add(
                source_id=job_id,
                target_id=table_id,
                source_type="job",
                target_type="table",
                edge_type="write",
                dependency_type=dependency_type,
                properties={"io_type": "output"},
            )

    def update_dependency_type(self, source_id: int, target_id: int, dep_type: str) -> None:
        """Update dependency_type for a specific edge."""
        self.db.execute(
            update(GraphEdge)
            .where(
                GraphEdge.source_node_id == source_id,
                GraphEdge.target_node_id == target_id,
            )
            .values(dependency_type=dep_type)
        )

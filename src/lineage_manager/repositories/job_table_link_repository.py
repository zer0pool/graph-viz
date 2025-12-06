import logging

from sqlalchemy import Select, distinct, select

from lineage_manager.models import GraphEdge, GraphNode
from lineage_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class JobTableLinkRepository(BaseRepository):
    """
    Compatibility repository that exposes the legacy job-table link API while
    sourcing data from the unified graph_edge table.
    """

    def __init__(self, db):
        super().__init__(db, "graph_edge")

    def link_job_table(self, job_id: int, table_id: int, io_type: str):
        """
        Legacy no-op. Edges are now managed directly via GraphEdgeRepository.
        Method kept for API compatibility.
        """
        logger.debug(
            "link_job_table called for job_id=%s table_id=%s io_type=%s (no-op)",
            job_id,
            table_id,
            io_type,
        )

    def clear_all(self):
        """No-op: compatibility hook."""
        logger.debug("JobTableLinkRepository.clear_all() no-op for unified schema")

    # -- helpers ----------------------------------------------------------
    def _job_select(self) -> Select:
        return select(GraphNode).where(GraphNode.node_type == "job")

    def _table_select(self) -> Select:
        return select(GraphNode).where(GraphNode.node_type == "table")

    def get_jobs_by_table_and_io_type(self, table_id: int, io_type: str):
        """Return job nodes connected to the table with the specified IO type."""
        if io_type == "input":
            stmt = (
                self._job_select()
                .join(GraphEdge, GraphNode.id == GraphEdge.target_node_id)
                .where(
                    GraphEdge.edge_type == "read",
                    GraphEdge.source_node_id == table_id,
                )
                .distinct()
            )
        else:
            stmt = (
                self._job_select()
                .join(GraphEdge, GraphNode.id == GraphEdge.source_node_id)
                .where(
                    GraphEdge.edge_type == "write",
                    GraphEdge.target_node_id == table_id,
                )
                .distinct()
            )
        return self.db.execute(stmt).scalars().all()

    def get_tables_by_job_and_io_type(self, job_id: int, io_type: str):
        """Return table nodes linked to the job with the specified IO type."""
        if io_type == "input":
            stmt = (
                self._table_select()
                .join(GraphEdge, GraphNode.id == GraphEdge.source_node_id)
                .where(
                    GraphEdge.edge_type == "read",
                    GraphEdge.target_node_id == job_id,
                )
                .distinct()
            )
        else:
            stmt = (
                self._table_select()
                .join(GraphEdge, GraphNode.id == GraphEdge.target_node_id)
                .where(
                    GraphEdge.edge_type == "write",
                    GraphEdge.source_node_id == job_id,
                )
                .distinct()
            )
        return self.db.execute(stmt).scalars().all()

    def get_related_tables_through_jobs(self, table_id: int):
        """
        Find tables that share a common job relationship with the provided table.
        """
        job_ids_stmt = (
            select(GraphEdge.target_node_id.label("node_id"))
            .where(
                GraphEdge.edge_type == "read",
                GraphEdge.source_node_id == table_id,
            )
            .union(
                select(GraphEdge.source_node_id.label("node_id")).where(
                    GraphEdge.edge_type == "write",
                    GraphEdge.target_node_id == table_id,
                )
            )
        ).subquery()

        stmt = (
            self._table_select()
            .join(GraphEdge, GraphNode.id == GraphEdge.target_node_id)
            .where(
                GraphEdge.edge_type == "write",
                GraphEdge.source_node_id.in_(select(job_ids_stmt.c.node_id)),
                GraphNode.id != table_id,
            )
            .distinct()
        )
        return self.db.execute(stmt).scalars().all()

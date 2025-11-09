import logging

from sqlalchemy import insert, select, text

from graph_manager.models import GraphEdge, GraphJobNode, GraphTableNode
from graph_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class GraphEdgeRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_edge")

    def add(
        self,
        source_id: int,
        target_id: int,
        source_type: str,
        target_type: str,
        edge_type: str,
        is_trigger_on: bool = False,
    ):
        """Add edge between nodes with readability fields"""
        logger.debug(
            f"Adding edge: {source_type}:{source_id} -> {target_type}:{target_id} ({edge_type})"
        )

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
                is_trigger_on=is_trigger_on,
            )
            .prefix_with("IGNORE")
        )
        logger.debug("Edge added successfully")

    def create_job_table_edge(
        self,
        job_id: int,
        table_id: int,
        io_type: str,
        is_trigger_on: bool = False,
    ):
        """Create an edge between job and table in the graph_edge table"""
        logger.debug(
            f"Creating job-table edge: job_id={job_id}, table_id={table_id}, io_type={io_type}"
        )

        if io_type == "input":
            # Table -> Job (input relationship)
            # Get human-readable names
            table_name = self.db.execute(
                select(GraphTableNode.full_name).where(GraphTableNode.id == table_id)
            ).scalar()
            job_name = self.db.execute(
                select(GraphJobNode.job_id).where(GraphJobNode.id == job_id)
            ).scalar()

            self.db.execute(
                insert(GraphEdge)
                .values(
                    source_node_id=table_id,
                    target_node_id=job_id,
                    source_node_type="table",
                    target_node_type="job",
                    edge_type="data_flow",
                    source_table_name=table_name,
                    target_job_id=job_name,
                    labels=[{"io_type": io_type}],
                    is_trigger_on=is_trigger_on,
                )
                .prefix_with("IGNORE")
            )
        elif io_type == "output":
            # Job -> Table (output relationship)
            # Get human-readable names
            job_name = self.db.execute(
                select(GraphJobNode.job_id).where(GraphJobNode.id == job_id)
            ).scalar()
            table_name = self.db.execute(
                select(GraphTableNode.full_name).where(GraphTableNode.id == table_id)
            ).scalar()

            self.db.execute(
                insert(GraphEdge)
                .values(
                    source_node_id=job_id,
                    target_node_id=table_id,
                    source_node_type="job",
                    target_node_type="table",
                    edge_type="data_flow",
                    source_job_id=job_name,
                    target_table_name=table_name,
                    labels=[{"io_type": io_type}],
                    is_trigger_on=is_trigger_on,
                )
                .prefix_with("IGNORE")
            )
        logger.debug("Job-table edge created successfully")

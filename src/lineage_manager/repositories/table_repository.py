import logging

from sqlalchemy import Select, func, select

from lineage_manager.models import GraphNode
from lineage_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class TableRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_node")

    def _base_query(self) -> Select:
        return select(GraphNode).where(GraphNode.node_type == "table")

    def get_or_create(self, full_name: str):
        row = self.db.execute(
            self._base_query().where(GraphNode.name == full_name)
        ).scalar_one_or_none()
        if row:
            return row

        parts = full_name.split(".")
        project = parts[0] if len(parts) > 0 else None
        dataset = parts[1] if len(parts) > 1 else None
        table = parts[2] if len(parts) > 2 else None

        properties = {
            "project_name": project,
            "dataset_name": dataset,
            "table_name": table,
            "storage_type": "database",
            "storage_path": full_name,
        }
        row = GraphNode(node_type="table", name=full_name, properties=properties)
        self.db.add(row)
        self.db.flush()
        logger.debug(f"Created table node: {full_name}")
        return row

    def get_by_id(self, table_id: int):
        """Get a table by database ID"""
        return self.db.execute(
            self._base_query().where(GraphNode.id == table_id)
        ).scalar_one_or_none()

    def get_by_full_name(self, full_name: str):
        """Get a table by its full name."""
        return self.db.execute(
            self._base_query().where(GraphNode.name == full_name)
        ).scalar_one_or_none()

    def search_by_prefix(self, prefix: str, limit: int = 10):
        """Search tables by prefix."""
        pattern = f"%{prefix.lower()}%"
        stmt = (
            self._base_query()
            .where(func.lower(GraphNode.name).like(pattern))
            .order_by(GraphNode.name)
            .limit(limit)
        )
        return self.db.execute(stmt).scalars().all()

    def count_tables(self):
        """Count all table nodes"""
        from sqlalchemy import func

        stmt = select(func.count()).select_from(
            select(GraphNode.id).where(GraphNode.node_type == "table").subquery()
        )
        result = self.db.execute(stmt).scalar()
        logger.debug(f"Counted {result} tables")
        return result

    def get_table_dag(
        self,
        table_name: str,
        max_depth: int = 3,
        direction: str = "both",
        include_jobs: bool = True,
        include_tables: bool = True,
    ):
        """Get DAG for a specific table including upstream and downstream dependencies"""
        from lineage_manager.repositories.job_table_link_repository import (
            JobTableLinkRepository,
        )

        logger.info(
            f"Getting DAG for table: {table_name} with max_depth: {max_depth}, "
            f"direction: {direction}, include_jobs: {include_jobs}, include_tables: {include_tables}"
        )

        # Get the table node
        table = self.db.execute(
            self._base_query().where(GraphNode.name == table_name)
        ).scalar_one_or_none()

        if not table:
            logger.warning(f"Table not found: {table_name}")
            return None

        logger.debug(f"Found table node: {table.full_name} (ID: {table.id})")

        # Use the dedicated JobTableLinkRepository for queries
        job_table_link_repo = JobTableLinkRepository(self.db)

        # Initialize collections based on direction and include flags
        upstream_jobs = []
        downstream_jobs = []
        related_tables = []

        if include_jobs:
            # Get upstream jobs (jobs that produce this table as output)
            if direction in ["upstream", "both"]:
                upstream_jobs = job_table_link_repo.get_jobs_by_table_and_io_type(
                    table.id, "output"
                )
                logger.debug(
                    f"Found {len(upstream_jobs)} upstream jobs for table {table_name}"
                )

            # Get downstream jobs (jobs that consume this table as input)
            if direction in ["downstream", "both"]:
                downstream_jobs = job_table_link_repo.get_jobs_by_table_and_io_type(
                    table.id, "input"
                )
                logger.debug(
                    f"Found {len(downstream_jobs)} downstream jobs for table {table_name}"
                )

        if include_tables:
            # Get related tables through jobs
            related_tables = job_table_link_repo.get_related_tables_through_jobs(
                table.id
            )
            logger.debug(
                f"Found {len(related_tables)} related tables for table {table_name}"
            )

        # Build nodes list following the specified response structure
        nodes = []
        edges = []
        logger.debug(
            f"Building DAG structure with {len(upstream_jobs)} upstream jobs, "
            f"{len(downstream_jobs)} downstream jobs, {len(related_tables)} related tables"
        )

        # Always add the base table node (label = short table name, include full_name)
        nodes.append(
            {
                "id": f"t{table.id}",
                "type": "table",
                "label": table.table_name or table.full_name,
                "full_name": table.full_name,
            }
        )

        # Add upstream job nodes and edges (job -> table)
        for job in upstream_jobs:
            nodes.append(
                {
                    "id": f"j{job.id}",
                    "type": "job",
                    "label": job.display_name,
                }
            )
            edges.append(
                {"source": f"j{job.id}", "target": f"t{table.id}", "io": "output"}
            )

        # Add downstream job nodes and edges (table -> job)
        for job in downstream_jobs:
            nodes.append(
                {
                    "id": f"j{job.id}",
                    "type": "job",
                    "label": job.display_name,
                }
            )
            edges.append(
                {"source": f"t{table.id}", "target": f"j{job.id}", "io": "input"}
            )

        # Add related table nodes
        for rel_table in related_tables:
            nodes.append(
                {
                    "id": f"t{rel_table.id}",
                    "type": "table",
                    "label": rel_table.table_name or rel_table.full_name,
                    "full_name": rel_table.full_name,
                }
            )

        dag_result = {
            "base_table": table_name,
            "direction": direction,
            "depth": max_depth,
            "nodes": nodes,
            "edges": edges,
        }

        logger.info(
            f"Successfully built DAG for table {table_name}: {len(nodes)} nodes, {len(edges)} edges"
        )
        logger.debug(
            f"DAG nodes: {[node['id'] + ':' + node['label'] for node in nodes]}"
        )
        logger.debug(
            f"DAG edges: {[edge['source'] + '->' + edge['target'] + '(' + edge['io'] + ')' for edge in edges]}"
        )

        return dag_result

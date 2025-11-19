import logging

from sqlalchemy import select

from graph_manager.models import GraphJobNode
from graph_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class JobRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_job_node")

    def get_or_create(self, job_id: str, **kwargs):
        """Get or create a job with the given ID and attributes"""
        logger.debug(f"Looking for job with ID: {job_id}")
        row = self.db.execute(
            select(GraphJobNode).where(GraphJobNode.job_id == job_id)
        ).scalar_one_or_none()
        if row:
            logger.debug(f"Found existing job: {job_id}")
            return row

        # Create new job with provided attributes
        logger.debug(f"Creating new job with ID: {job_id}, attributes: {kwargs}")
        # Set default values for required fields
        job_data = {
            "job_id": job_id,
            "name": kwargs.get("name", kwargs.get("label", job_id)),
            "labels": kwargs.get("labels", {}),
            "owner": kwargs.get("owner"),
            "write_mode": kwargs.get("write_mode"),
            "destination_type": kwargs.get("destination_type"),
            "destination_table": kwargs.get("destination_table"),
            "trigger_tables": kwargs.get("trigger_tables", []),
            "reference_tables": kwargs.get("reference_tables", []),
            "job_metadata": kwargs.get("job_metadata", kwargs.get("node_metadata", {})),
        }
        row = GraphJobNode(**job_data)
        self.db.add(row)
        self.db.flush()
        logger.debug(f"Successfully created job: {job_id}")
        return row

    def get(self, job_id: str):
        """Get a job by ID"""
        return self.db.execute(
            select(GraphJobNode).where(GraphJobNode.job_id == job_id)
        ).scalar_one_or_none()

    def get_by_id(self, job_id: int):
        """Get a job by database ID"""
        return self.db.execute(
            select(GraphJobNode).where(GraphJobNode.id == job_id)
        ).scalar_one_or_none()

    def update(self, job_id: str, **kwargs):
        """Update job attributes"""
        job = self.get(job_id)
        if job:
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
        return job

    def list_all(self):
        """List all jobs"""
        return self.db.execute(select(GraphJobNode)).scalars().all()

    def find_upstream_jobs_by_output_tables(
        self, table_ids: list[int], exclude_job_id: int
    ):
        """Find jobs that output to the given tables (excluding the specified job)"""
        from sqlalchemy import text

        if not table_ids:
            return []

        query = text(
            """
            SELECT DISTINCT jl.job_id 
            FROM graph_job_table_link jl
            WHERE jl.table_id IN :table_ids 
            AND jl.io_type = 'output'
            AND jl.job_id != :exclude_job_id
        """
        )

        result = self.db.execute(
            query, {"table_ids": tuple(table_ids), "exclude_job_id": exclude_job_id}
        )
        return result.scalars().all()

    def search(self, q: str, limit: int = 10):
        """Search jobs by job_id or name (ILIKE if supported)."""
        from sqlalchemy import or_

        stmt = (
            select(GraphJobNode)
            .where(or_(GraphJobNode.job_id.like(q), GraphJobNode.name.like(q)))
            .limit(limit)
        )
        return self.db.execute(stmt).scalars().all()

    def list_by_owner(self, owner: str, limit: int = 10):
        """Return recent jobs for the given owner identifier."""
        stmt = (
            select(GraphJobNode)
            .where(GraphJobNode.owner == owner)
            .order_by(GraphJobNode.updated_at.desc())
            .limit(limit)
        )
        return self.db.execute(stmt).scalars().all()

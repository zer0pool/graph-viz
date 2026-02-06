from typing import List, Optional, Any
import logging
from sqlalchemy import Select, func, or_, select, desc, cast, String

from lineage_manager.models import GraphEdge, GraphNode
from lineage_manager.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class JobRepository(BaseRepository):
    """Repository that manages job-type nodes stored in graph_node."""

    def __init__(self, db):
        super().__init__(db, "graph_node")

    def _base_query(self) -> Select:
        return select(GraphNode).where(GraphNode.node_type == "job")

    def get_or_create(self, job_id: str, **kwargs):
        """Get or create a job with the given ID and attributes"""
        logger.debug(f"Looking for job with ID: {job_id}")
        row = self.db.execute(
            self._base_query().where(GraphNode.name == job_id)
        ).scalar_one_or_none()
        if row:
            logger.debug(f"Found existing job: {job_id}")
            return row

        logger.debug(f"Creating new job node for ID: {job_id}")

        # Build properties dynamically - only include provided non-None values
        # This prevents bloating the JSON with empty lists/defaults
        properties = {}

        # Map well-known attributes
        mapping = {
            "display_name": kwargs.get("name", kwargs.get("label", job_id)),
            "labels": kwargs.get("labels"),
            "owners": kwargs.get("owners", []),   
            "write_mode": kwargs.get("write_mode"),
            "upstreams": kwargs.get("upstreams"),
            "downstreams": kwargs.get("downstreams"),
            "schedule": kwargs.get("schedule"),
            "logic_type": kwargs.get("logic_type"),
            "status": kwargs.get("status"),
            "type": kwargs.get("type"),
        }

        for key, val in mapping.items():
            if val is not None:
                # For lists/dicts, only add if not empty to further reduce noise
                if isinstance(val, (list, dict)) and not val:
                    continue
                properties[key] = val

        # Add any other provided attributes to properties to avoid losing metadata
        # (e.g. logic_type, description, custom labels, etc.)
        for key, val in kwargs.items():
            if key not in properties and val is not None:
                properties[key] = val

        row = GraphNode(node_type="job", name=job_id, properties=properties)
        self.db.add(row)
        self.db.flush()
        logger.debug(f"Successfully created job node {job_id} with {len(properties)} properties")
        return row

    def get(self, job_id: str):
        """Get a job by external job_id"""
        return self.db.execute(
            self._base_query().where(GraphNode.name == job_id)
        ).scalar_one_or_none()

    def get_by_id(self, job_id: int):
        """Get a job by database ID"""
        return self.db.execute(
            self._base_query().where(GraphNode.id == job_id)
        ).scalar_one_or_none()

    def update(self, job_id: str, **kwargs):
        """Update job attributes"""
        job = self.get(job_id)
        if job:
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
                else:
                    job._set_prop(key, value)
        return job

    def list_all(self):
        """List all jobs"""
        return self.db.execute(self._base_query()).scalars().all()

    def count_jobs(self):
        """Count all job nodes using SQL count for performance"""
        stmt = select(func.count()).select_from(
            select(GraphNode.id).where(GraphNode.node_type == "job").subquery()
        )
        result = self.db.execute(stmt).scalar()
        logger.debug(f"Counted {result} jobs")
        return result

    def find_upstream_jobs_by_output_tables(
        self, table_ids: list[int], exclude_job_id: int
    ) -> List[tuple[int, int]]:
        """Find jobs that write to the specified table node IDs.
        Returns list of (source_job_id, connecting_table_id).
        """
        if not table_ids:
            return []

        stmt = (
            select(GraphEdge.source_node_id, GraphEdge.target_node_id)
            .where(
                GraphEdge.edge_type == "write",
                GraphEdge.target_node_id.in_(tuple(table_ids)),
                GraphEdge.source_node_id != exclude_job_id,
            )
        )
        # Return as list of (source_job_id, target_table_id)
        return [(row[0], row[1]) for row in self.db.execute(stmt).all()]

    def search_by_prefix(self, prefix: str, limit: int = 10):
        """Search jobs by job_id or display name prefix."""
        pattern = f"%{prefix.lower()}%"

        # Use as_string() for JSON property extraction for better compatibility
        display_name_field = GraphNode.properties["display_name"].as_string()

        stmt = (
            self._base_query()
            .where(
                or_(
                    func.lower(GraphNode.name).like(pattern),
                    func.lower(display_name_field).like(pattern),
                )
            )
            .order_by(GraphNode.name)
            .limit(limit)
        )

        return self.db.execute(stmt).scalars().all()

    def search_owners_by_prefix(self, prefix: str, limit: int = 10):
        """Find distinct owners matching the prefix, with a sample job id."""
        # owners is a JSON array in properties
        owners_field = GraphNode.properties["owners"]
        pattern = f"%{prefix.lower()}%"
        
        # We need to extract owners and check prefix
        # This is a bit tricky with JSON arrays in MySQL via SQLAlchemy
        # For now, we'll fetch relevant jobs and extract unique owners in-app
        # since owner count is usually small.
        stmt = (
            select(GraphNode.name.label("job_id"), owners_field.label("owners"))
            .where(
                GraphNode.node_type == "job"
            )
            .limit(limit * 20) # Over-fetch to find unique owners
        )

        owners = []
        seen = set()
        for row in self.db.execute(stmt):
            job_owners = row.owners or []
            if not isinstance(job_owners, list):
                if isinstance(job_owners, str):
                    job_owners = [job_owners]
                else:
                    continue
            
            for owner_name in job_owners:
                if not owner_name or owner_name in seen:
                    continue
                if prefix.lower() in owner_name.lower():
                    owners.append({"name": owner_name, "sample_job_id": row.job_id})
                    seen.add(owner_name)
                
            if len(owners) >= limit:
                break
        return owners

    def list_by_owner(self, owner: str, limit: int = 10):
        """Return jobs attributed to the supplied owner name."""
        if not owner:
            return []
        
        from sqlalchemy import func
        # Use json_contains to find owner in owners list
        owners_field = GraphNode.properties["owners"]
        stmt = (
            self._base_query()
            .where(func.json_contains(owners_field, func.json_quote(owner)))
            .order_by(desc(GraphNode.updated_at))
            .limit(limit)
        )
        return self.db.execute(stmt).scalars().all()

    def get_all_search_terms(self):
        """
        Fetch basic identifiers (name, display_name, owner) for all jobs.
        Used for in-memory fuzzy search caching.
        """
        owners_field = GraphNode.properties["owners"]
        display_name_field = GraphNode.properties["display_name"].as_string()

        stmt = select(
            GraphNode.name.label("job_id"),
            display_name_field.label("display_name"),
            owners_field.label("owners"),
        ).where(GraphNode.node_type == "job")

        return self.db.execute(stmt).all()

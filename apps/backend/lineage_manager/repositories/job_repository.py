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
            "owner": kwargs.get("owner"),
            "write_mode": kwargs.get("write_mode"),
            "upstreams": kwargs.get("upstreams"),
            "downstreams": kwargs.get("downstreams"),            
            "schedule": kwargs.get("schedule"),
            "lifecycle_status": kwargs.get("lifecycle_status"),
            "status": kwargs.get("status"),
            "type": kwargs.get("type"),
        }

        for key, val in mapping.items():
            if val is not None:
                # For lists/dicts, only add if not empty to further reduce noise
                if isinstance(val, (list, dict)) and not val:
                    continue
                properties[key] = val

        row = GraphNode(node_type="job", name=job_id, properties=properties)
        self.db.add(row)
        self.db.flush()
        logger.debug(f"Successfully created job node: {job_id}")
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
    ):
        """Find jobs that write to the specified table node IDs."""
        if not table_ids:
            return []

        stmt = (
            select(GraphEdge.source_node_id)
            .where(
                GraphEdge.edge_type == "write",
                GraphEdge.target_node_id.in_(tuple(table_ids)),
                GraphEdge.source_node_id != exclude_job_id,
            )
            .distinct()
        )
        return [row[0] for row in self.db.execute(stmt).all()]

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
        owner_field = GraphNode.properties["owner"].as_string()
        pattern = f"%{prefix.lower()}%"
        stmt = (
            select(GraphNode.name.label("job_id"), owner_field.label("owner"))
            .where(
                GraphNode.node_type == "job",
                owner_field.isnot(None),
                owner_field != "",
                func.lower(owner_field).like(pattern),
            )
            .order_by(owner_field, GraphNode.name)
            .limit(limit * 5)
        )

        owners = []
        seen = set()
        for row in self.db.execute(stmt):
            owner_name = row.owner
            if not owner_name or owner_name in seen:
                continue
            owners.append({"name": owner_name, "sample_job_id": row.job_id})
            seen.add(owner_name)
            if len(owners) >= limit:
                break
        return owners

    def list_by_owner(self, owner: str, limit: int = 10):
        """Return jobs attributed to the supplied owner name."""
        if not owner:
            return []
        owner_field = GraphNode.properties["owner"].as_string()
        stmt = (
            self._base_query()
            .where(func.lower(owner_field) == owner.lower())
            .order_by(desc(GraphNode.updated_at))
            .limit(limit)
        )
        return self.db.execute(stmt).scalars().all()

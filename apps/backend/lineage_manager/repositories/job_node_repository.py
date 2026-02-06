"""Job node repository for search and management."""

from typing import List, Optional, Tuple

import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy.orm import Session

from lineage_manager.models.graph_node import GraphNode
from lineage_manager.models.job_node import JobNode
from lineage_manager.models.project import Project
from lineage_manager.repositories.base_repository import BaseRepository


class JobNodeRepository(BaseRepository):
    """Repository for Job node operations."""

    def __init__(self, session: Session):
        super().__init__(session, JobNode)

    def get_by_node_id(self, node_id: int) -> Optional[JobNode]:
        """Get job node by node ID."""
        return self.session.query(JobNode).filter_by(node_id=node_id).first()

    def get_by_job_id(self, job_id: str) -> Optional[JobNode]:
        """Get job node by unique job ID."""
        return self.session.query(JobNode).filter_by(job_id=job_id).first()

    def create_or_update(
        self,
        node_id: int,
        job_id: str,
        project_id: str,
        owners: List[str] = None,
        properties: dict = None,
    ) -> JobNode:
        """Create or update job node data."""
        existing = self.get_by_node_id(node_id)

        if existing:
            # Update
            existing.job_id = job_id
            existing.project_id = project_id
            if owners is not None:
                existing.owners = owners
            if properties is not None:
                existing.properties = properties
            self.session.flush()
            return existing
        else:
            # Create
            job_node = JobNode(
                node_id=node_id,
                job_id=job_id,
                project_id=project_id,
                owners=owners or [],
                properties=properties or {},
            )
            self.session.add(job_node)
            self.session.flush()
            return job_node

    def find_by_project(
        self, project_id: str, limit: int = 20, offset: int = 0
    ) -> Tuple[List[Tuple[GraphNode, JobNode]], int]:
        """
        Find jobs by project ID.

        Returns:
            (results, total_count)
        """
        query = (
            self.session.query(
                GraphNode, JobNode, Project.display_name.label("project_name")
            )
            .join(JobNode, GraphNode.id == JobNode.node_id)
            .outerjoin(Project, JobNode.project_id == Project.project_id)
            .filter(JobNode.project_id == project_id)
        )

        total = query.count()
        results = query.limit(limit).offset(offset).all()

        return results, total

    def find_by_owner(
        self, owner_id: str, limit: int = 20, offset: int = 0
    ) -> Tuple[List[Tuple[GraphNode, JobNode]], int]:
        """
        Find jobs by owner ID (where owner_id is in the owners JSON list).

        Returns:
            (results, total_count)
        """
        from sqlalchemy import text

        # Using JSON_CONTAINS for MySQL
        query = (
            self.session.query(GraphNode, JobNode)
            .join(JobNode, GraphNode.id == JobNode.node_id)
            .filter(func.json_contains(JobNode.owners, sa.cast(sa.json.quote_extension(owner_id), sa.JSON)))
        )
        # Wait, more portable/simpler way for JSON_CONTAINS in SQLAlchemy?
        # Let's use a simpler filter if owners is a list of strings
        query = (
            self.session.query(GraphNode, JobNode)
            .join(JobNode, GraphNode.id == JobNode.node_id)
            .filter(func.json_contains(JobNode.owners, func.json_quote(owner_id)))
        )

        total = query.count()
        results = query.limit(limit).offset(offset).all()

        return results, total

    def get_project_stats(self, project_id: str) -> dict:
        """Get statistics for a project."""
        job_count = self.session.query(JobNode).filter_by(project_id=project_id).count()

        return {"jobs": job_count}

    def get_owner_stats(self, owner_id: str) -> dict:
        """Get statistics for a user/owner."""
        job_count = (
            self.session.query(JobNode)
            .filter(func.json_contains(JobNode.owners, func.json_quote(owner_id)))
            .count()
        )

        return {"owned_jobs": job_count}

    def list_projects_with_counts(self, limit: int = 100) -> List[dict]:
        """List all projects with job counts."""
        results = (
            self.session.query(
                JobNode.project_id, func.count(JobNode.node_id).label("job_count")
            )
            .group_by(JobNode.project_id)
            .order_by(func.count(JobNode.node_id).desc())
            .limit(limit)
            .all()
        )

        return [{"project_id": r.project_id, "job_count": r.job_count} for r in results]

    def list_all_jobs(
        self, limit: int = 20, offset: int = 0
    ) -> Tuple[List[Tuple[GraphNode, JobNode]], int]:
        """
        List all jobs sorted by recently updated.
        """
        query = (
            self.session.query(
                GraphNode, JobNode, Project.display_name.label("project_name")
            )
            .join(JobNode, GraphNode.id == JobNode.node_id)
            .outerjoin(Project, JobNode.project_id == Project.project_id)
            .order_by(JobNode.updated_at.desc())
        )

        total = query.count()
        results = query.limit(limit).offset(offset).all()

        return results, total

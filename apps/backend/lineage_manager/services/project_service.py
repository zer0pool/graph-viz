"""Project service for project-related business logic."""

import logging
from typing import Dict, List, Optional

from lineage_manager.core.uow import GraphUnitOfWork

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for project management and queries."""
    
    def __init__(self, uow: GraphUnitOfWork):
        self.uow = uow
    
    def get_project_detail(self, project_id: str) -> Dict:
        """
        Get project detail with summary statistics.
        
        Args:
            project_id: Project identifier
            
        Returns:
            Project detail with summary
            
        Raises:
            ValueError: If project not found
        """
        project = self._get_project_or_create_placeholder(project_id)
        stats = self._get_project_statistics(project_id)
        
        return {
            "project": self._format_project(project),
            "summary": stats
        }
    
    def list_project_jobs(
        self, 
        project_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> Dict:
        """
        List jobs in a project with pagination.
        
        Args:
            project_id: Project identifier
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            Jobs list with pagination info
        """
        results, total = self.uow.job_node.find_by_project(
            project_id, limit, offset
        )
        
        jobs = [self._format_job(node, meta) for node, meta in results]
        
        return {
            "jobs": jobs,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    def list_all_projects(self, limit: int = 100) -> List[Dict]:
        """
        List all projects with job counts.
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List of projects with statistics
        """
        projects = self.uow.job_node.list_projects_with_counts(limit)
        
        return [
            {
                "project_id": p["project_id"],
                "job_count": p["job_count"]
            }
            for p in projects
        ]
    
    # Private helper methods (small, focused functions)
    
    def _get_project_or_create_placeholder(self, project_id: str):
        """Get project from DB or create placeholder."""
        project = self.uow.project.get(project_id)
        
        if not project:
            # Create placeholder project if not exists
            logger.info(f"Creating placeholder project: {project_id}")
            project = self.uow.project.create_or_update(
                project_id=project_id,
                display_name=self._generate_display_name(project_id),
                description="Auto-generated project"
            )
        
        return project
    
    def _get_project_statistics(self, project_id: str) -> Dict:
        """Get project statistics."""
        return self.uow.job_node.get_project_stats(project_id)
    
    def _format_project(self, project) -> Dict:
        """Format project for API response."""
        return {
            "project_id": project.project_id,
            "display_name": project.display_name,
            "description": project.description,
            "business_unit": project.business_unit,
            "status": project.status
        }
    
    def _format_job(self, node, meta) -> Dict:
        """Format job for API response."""
        properties = meta.properties or {}
        
        return {
            "node_id": node.id,
            "job_id": node.name,
            "job_name": properties.get("display_name", node.name),
            "project_id": meta.project_id,
            "owner_id": meta.owner_id,
            "status": properties.get("status", "unknown"),
            "enabled": properties.get("enabled", True)
        }
    
    def _generate_display_name(self, project_id: str) -> str:
        """Generate human-readable display name from project ID."""
        return project_id.replace("-", " ").replace("_", " ").title()

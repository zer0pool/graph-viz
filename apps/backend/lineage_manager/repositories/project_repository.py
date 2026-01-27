"""Project repository."""

from typing import List, Optional

from sqlalchemy.orm import Session

from lineage_manager.models.project import Project
from lineage_manager.repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository):
    """Repository for Project operations."""
    
    def __init__(self, session: Session):
        super().__init__(session, Project)
    
    def get(self, project_id: str) -> Optional[Project]:
        """Get project by ID."""
        return self.session.query(Project).filter_by(project_id=project_id).first()
    
    def create_or_update(
        self,
        project_id: str,
        display_name: str,
        description: str = None,
        business_unit: str = None,
        status: str = "ACTIVE"
    ) -> Project:
        """Create or update project."""
        existing = self.get(project_id)
        
        if existing:
            # Update
            existing.display_name = display_name
            if description is not None:
                existing.description = description
            if business_unit is not None:
                existing.business_unit = business_unit
            existing.status = status
            self.session.flush()
            return existing
        else:
            # Create
            project = Project(
                project_id=project_id,
                display_name=display_name,
                description=description,
                business_unit=business_unit,
                status=status
            )
            self.session.add(project)
            self.session.flush()
            return project
    
    def list_all(self, limit: int = 100, offset: int = 0) -> List[Project]:
        """List all active projects."""
        return (
            self.session.query(Project)
            .filter_by(status="ACTIVE")
            .order_by(Project.display_name)
            .limit(limit)
            .offset(offset)
            .all()
        )

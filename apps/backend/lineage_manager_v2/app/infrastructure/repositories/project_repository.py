from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.project.entities import Project as ProjectEntity
from app.infrastructure.models import Project as ProjectModel


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, project_id: str) -> Optional[ProjectEntity]:
        result = await self.db.execute(
            select(ProjectModel).where(ProjectModel.project_id == project_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_all(self, status: str = "ACTIVE") -> List[ProjectEntity]:
        result = await self.db.execute(
            select(ProjectModel).where(ProjectModel.status == status)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    async def save(self, entity: ProjectEntity) -> ProjectEntity:
        result = await self.db.execute(
            select(ProjectModel).where(ProjectModel.project_id == entity.project_id)
        )
        model = result.scalar_one_or_none()
        if model:
            # Update
            model.display_name = entity.display_name
            model.description = entity.description
            model.business_unit = entity.business_unit
            model.status = entity.status
        else:
            # Create
            model = ProjectModel(
                project_id=entity.project_id,
                display_name=entity.display_name,
                description=entity.description,
                business_unit=entity.business_unit,
                status=entity.status,
            )
            self.db.add(model)

        await self.db.flush()  # Ensure ID is populated if it was serial (not here since project_id is string)
        await self.db.refresh(model)
        return self._to_entity(model)

    async def count(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count()).select_from(ProjectModel))
        return result.scalar() or 0

    def _to_entity(self, model: ProjectModel) -> ProjectEntity:
        return ProjectEntity(
            project_id=model.project_id,
            display_name=model.display_name,
            description=model.description,
            business_unit=model.business_unit,
            status=model.status,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

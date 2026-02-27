from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.api.v1.schemas import resources as schemas
from app.services.metadata_service import MetadataService
from app.domain.project.entities import Project as ProjectEntity

router = APIRouter()


@router.post("/", response_model=schemas.Project, status_code=status.HTTP_201_CREATED)
@inject
async def create_project(
    data: schemas.ProjectCreate,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    project = ProjectEntity(
        project_id=data.project_id,
        display_name=data.display_name,
        description=data.description,
    )
    return await service.create_project(project)


@router.get("/", response_model=List[schemas.Project])
@inject
async def list_projects(
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.list_projects()


@router.get("/{project_id}", response_model=schemas.Project)
@inject
async def get_project(
    project_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/jobs", response_model=List[schemas.Job])
@inject
async def list_project_jobs(
    project_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.list_jobs_by_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return await uow.jobs.list_by_project(project_id)

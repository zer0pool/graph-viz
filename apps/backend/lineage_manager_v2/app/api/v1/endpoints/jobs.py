from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.api.v1.schemas import resources as schemas
from app.api.v1.schemas.graph import CommandResponse
from app.services.metadata_service import MetadataService
from app.domain.graph.entities.job_node import JobNode as JobEntity

router = APIRouter()


@router.post("/", response_model=schemas.Job, status_code=status.HTTP_201_CREATED)
@inject
async def create_job(
    data: schemas.JobCreate,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    job = JobEntity(
        id=None,
        project_id=data.project_id,
        name=data.name,
        properties={
            **data.properties,
            "job_id": data.properties.get("job_id") or f"{data.project_id}.{data.name}",
        },
    )
    return await service.create_job(job)


@router.get("/{job_id}", response_model=schemas.Job)
@inject
async def get_job(
    job_id: str, service: MetadataService = Depends(Provide[Container.metadata_service])
):
    job = await service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/project/{project_id}", response_model=List[schemas.Job])
@inject
async def list_jobs_by_project(
    project_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.list_jobs_by_project(project_id)


@router.get("/owner/{user_id}", response_model=List[schemas.Job])
@inject
async def list_jobs_by_owner(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.list_jobs_by_owner(user_id)


@router.post("/{job_id}/pause", response_model=CommandResponse)
async def pause_job(job_id: str, user_id: str = "current_user"):
    """
    Trigger a background task to pause a job.
    """
    from app.tasks.graph_tasks import pause_job_task

    task = pause_job_task.delay(job_id, user_id)
    return CommandResponse(status="accepted", task_id=task.id)


@router.post("/{job_id}/resume", response_model=CommandResponse)
async def resume_job(job_id: str, user_id: str = "current_user"):
    """
    Trigger a background task to resume a job.
    """
    from app.tasks.graph_tasks import resume_job_task

    task = resume_job_task.delay(job_id, user_id)
    return CommandResponse(status="accepted", task_id=task.id)

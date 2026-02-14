from fastapi import APIRouter, Depends, status
from typing import List
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.api.v1.schemas import resources as schemas
from app.services.metadata_service import MetadataService

router = APIRouter()


@router.get("/{user_id}/jobs", response_model=List[schemas.Job])
@inject
async def list_user_jobs(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.list_jobs_by_owner(user_id)

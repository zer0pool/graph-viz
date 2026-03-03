from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.schemas import resources as schemas
from app.core.container import Container
from app.domain.metadata.entities.resource import ResourceMetadata as ResourceEntity
from app.services.metadata_service import MetadataService

router = APIRouter()


@router.post("/", response_model=schemas.Resource, status_code=status.HTTP_201_CREATED)
@inject
async def create_resource(
    data: schemas.ResourceCreate,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    resource = ResourceEntity(
        id=0,  # Will be set by repo
        project_id=data.project_id,
        fqn=data.fqn,
        data_type=data.data_type or "TABLE",
        schema_info=data.data_info or {},
        properties=data.data_info or {},
    )
    return await service.create_resource(resource)


@router.get("/{fqn:path}", response_model=schemas.Resource)
@inject
async def get_resource(
    fqn: str, service: MetadataService = Depends(Provide[Container.metadata_service])
):
    resource = await service.get_resource(fqn)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

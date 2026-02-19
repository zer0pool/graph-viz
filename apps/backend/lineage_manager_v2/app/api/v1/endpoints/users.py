import logging
from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.schemas import resources as schemas
from app.core.container import Container
from app.services.metadata_service import MetadataService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[schemas.User])
@inject
async def list_users(
    limit: int = 20,
    offset: int = 0,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    """
    List all users (paginated).
    """
    try:
        return await service.list_users(limit, offset)
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user list",
        )


@router.get("/{user_id}/jobs", response_model=List[schemas.Job])
@inject
async def list_user_jobs(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    try:
        return await service.list_jobs_by_owner(user_id)
    except Exception as e:
        logger.error(f"Error listing jobs for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve jobs for user {user_id}",
        )

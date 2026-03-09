import logging
from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.v1.schemas import resources as schemas
from app.core.container import Container
from app.services.auth_service import AuthService
from app.services.metadata_service import MetadataService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=schemas.UserListResponse)
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
        users, total = await service.list_users(limit, offset)
        return schemas.UserListResponse(
            users=users, total=total, limit=limit, offset=offset
        )
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user list",
        )


@router.get("/{user_id}/jobs", response_model=schemas.UserJobResponse)
@inject
async def list_user_jobs(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    try:
        jobs = await service.list_jobs_by_owner(user_id)
        return {"jobs": jobs, "total": len(jobs)}
    except Exception as e:
        logger.error(f"Error listing jobs for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve jobs for user {user_id}",
        )


@router.get("/{user_id}", response_model=schemas.UserDetail)
@inject
async def get_user_detail(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    """
    Get detailed user profile including summary stats.
    """
    try:
        detail = await service.get_user_detail(user_id)
        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting user detail for {user_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user details",
        )


@router.get("/{user_id}/projects", response_model=schemas.UserProjectResponse)
@inject
async def list_user_projects(
    user_id: str,
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    """
    List projects a user belongs to.
    """
    try:
        projects = await service.list_user_projects(user_id)
        return {"projects": projects, "total": len(projects)}
    except Exception as e:
        logger.error(
            f"Error listing projects for user {user_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user projects",
        )


@router.patch("/{user_id}/roles", response_model=schemas.User)
@inject
async def update_user_roles(
    user_id: str,
    role_update: schemas.UserRoleUpdate,
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    """Update roles for a user."""
    ctx_user = auth_service.get_current_user(request)
    if not ctx_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    try:
        performed_by = ctx_user.get("email") or ctx_user.get("sub") or "UNKNOWN"
        user = await service.update_user_roles(
            user_id=user_id, roles=role_update.roles, performed_by=performed_by
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update user roles: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

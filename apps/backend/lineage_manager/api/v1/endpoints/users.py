import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException

from typing import List
from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.user_service import UserService
from lineage_manager.api.v1.schemas import UserInfo

logger = logging.getLogger(__name__)

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    dependencies=AUTH_DEPS,
)


@router.get("/me")
@inject
def get_me(
    ctx_user: dict = Depends(require_authenticated_user),
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    profile = user_service.get_profile(ctx_user["sub"])
    if not profile:
        logger.warning("Authenticated user '%s' not found in profile store", ctx_user["sub"])
        raise HTTPException(status_code=404, detail="User not found")
    user_info = profile.get("user", {})
    logger.info(
        "Profile requested for %s: name=%s, email=%s, organization=%s",
        ctx_user["sub"],
        user_info.get("name"),
        user_info.get("email"),
        user_info.get("organization"),
    )
    return profile


@router.get("/")
@inject
def list_users(
    limit: int = 100,
    offset: int = 0,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    """List users from catalog."""
    try:
        return user_service.list_users(limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
@inject
def get_user_detail(
    user_id: str,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    """Get user detail with summary stats."""
    try:
        return user_service.get_user_detail(user_id)
    except Exception as e:
        logger.error(f"Failed to get user detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/jobs")
@inject
def list_user_jobs(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    """
    List jobs owned by a user.
    
    Args:
        user_id: User identifier
        limit: Maximum number of results
        offset: Offset for pagination
        
    Returns:
        Jobs list with pagination info
    """
    try:
        return user_service.get_user_jobs(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Failed to list user jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/projects")
@inject
def list_user_projects(
    user_id: str,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    """
    List projects a user belongs to.
    """
    try:
        return user_service.get_user_projects(user_id)
    except Exception as e:
        logger.error(f"Failed to list user projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException

from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
)


@router.get("/me")
@inject
def get_me(
    ctx_user: dict = Depends(require_authenticated_user),
    user_service: UserService = Depends(Provide[GraphContainer.user_service]),
):
    profile = user_service.get_profile(ctx_user["sub"])
    if not profile:
        logger.warning("Authenticated user '%s' not found in profile store", ctx_user["sub"])
        raise HTTPException(status_code=404, detail="User not found")
    logger.debug("Returning profile for user '%s'", ctx_user["sub"])
    return profile

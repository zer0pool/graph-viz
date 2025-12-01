from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException

from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.user_service import UserService

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
        raise HTTPException(status_code=404, detail="User not found")
    return profile

import logging
from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from lineage_manager.api.v1.schemas import UserCreate, UserUpdate, UserResponse
from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.user_service import UserService

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
    return profile


@router.get("", response_model=List[UserResponse])
@inject
def list_users(
    limit: int = 100,
    offset: int = 0,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    return user_service.list_users(limit, offset)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@inject
def create_user(
    user_in: UserCreate,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    try:
        return user_service.create_user(user_in.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
@inject
def get_user(
    user_id: int,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
@inject
def update_user(
    user_id: int,
    user_in: UserUpdate,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    user = user_service.update_user(user_id, user_in.model_dump(exclude_unset=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
def delete_user(
    user_id: int,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")


from lineage_manager.models.user_account import UserRole

# ... (rest of imports)

@router.post("/{user_id}/roles/{role}", response_model=UserResponse)
@inject
def add_role(
    user_id: int,
    role: UserRole,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    user = user_service.add_role(user_id, role.value)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}/roles/{role}", response_model=UserResponse)
@inject
def remove_role(
    user_id: int,
    role: UserRole,
    user_service: UserService = Depends(Provide[GraphContainer.user.user_service]),
):
    user = user_service.remove_role(user_id, role.value)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

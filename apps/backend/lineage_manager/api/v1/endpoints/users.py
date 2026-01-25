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


@router.get("/", response_model=List[UserInfo])
def list_users():
    """Returns a list of dummy users matching Figma design."""
    return [
        {
            "id": "user-001",
            "name": "John Doe",
            "email": "john.doe@company.com",
            "roles": ["PM", "OPERATOR"],
            "department": "Data Engineering",
            "lastActive": "2026-01-18 09:30",
        },
        {
            "id": "user-002",
            "name": "Jane Smith",
            "email": "jane.smith@company.com",
            "roles": ["DEVELOPER", "OPERATOR"],
            "department": "Analytics",
            "lastActive": "2026-01-18 08:15",
        },
        {
            "id": "user-003",
            "name": "Mike Johnson",
            "email": "mike.johnson@company.com",
            "roles": ["PM"],
            "department": "Business Intelligence",
            "lastActive": "2026-01-17 16:45",
        },
        {
            "id": "user-004",
            "name": "Sarah Williams",
            "email": "sarah.williams@company.com",
            "roles": ["PM", "OPERATOR", "DEVELOPER"],
            "department": "Data Engineering",
            "lastActive": "2026-01-18 10:00",
        },
        {
            "id": "user-005",
            "name": "Tom Brown",
            "email": "tom.brown@company.com",
            "roles": ["OPERATOR"],
            "department": "Operations",
            "lastActive": "2026-01-18 09:50",
        },
        {
            "id": "user-006",
            "name": "Emily Davis",
            "email": "emily.davis@company.com",
            "roles": ["PM", "DEVELOPER"],
            "department": "Analytics",
            "lastActive": "2026-01-17 14:20",
        },
        {
            "id": "user-007",
            "name": "David Wilson",
            "email": "david.wilson@company.com",
            "roles": ["PM"],
            "department": "Finance",
            "lastActive": "2026-01-18 07:30",
        },
        {
            "id": "user-008",
            "name": "Lisa Garcia",
            "email": "lisa.garcia@company.com",
            "roles": ["OPERATOR", "DEVELOPER"],
            "department": "Data Engineering",
            "lastActive": "2026-01-18 09:15",
        },
    ]


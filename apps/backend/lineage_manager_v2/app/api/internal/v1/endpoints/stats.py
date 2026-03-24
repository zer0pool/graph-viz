from typing import Any, Dict

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends

from app.core.container import Container
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/stats")
@inject
async def get_internal_stats(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
) -> Dict[str, Any]:
    """Returns high-level statistics for internal consumption (e.g., Analytics Manager)."""
    return await service.get_internal_stats()

from typing import Any, Dict, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.v1.schemas.analytics import DashboardMetricsResponse
from app.core.container import Container
from app.services.analytics_service import AnalyticsService

router = APIRouter()


class TrackVisitRequest(BaseModel):
    path: str
    title: Optional[str] = None
    visitor_id: Optional[str] = None


@router.get("/dashboard-metrics", response_model=DashboardMetricsResponse)
@inject
async def get_dashboard_metrics(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    return await service.get_dashboard_metrics()


@router.post("/track", status_code=201)
@inject
async def track_visit(
    req: TrackVisitRequest,
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
) -> Dict[str, str]:
    """Records a page view event from the frontend."""
    await service.track_visit(path=req.path, title=req.title, visitor_id=req.visitor_id)
    return {"status": "ok"}


@router.get("/top-visited")
@inject
async def get_top_visited(
    limit: int = Query(default=5, ge=1, le=20),
    days: int = Query(default=7, ge=1, le=90),
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
) -> Dict[str, Any]:
    """Returns the most visited pages within the given time window."""
    items = await service.get_top_visited(limit=limit, days=days)
    return {"items": items, "window_days": days}

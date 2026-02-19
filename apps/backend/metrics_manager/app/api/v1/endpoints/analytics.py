from fastapi import APIRouter, Depends, status, HTTPException
from dependency_injector.wiring import inject, Provide
from app.api.v1.schemas.analytics import TrackEvent, TrackResponse
from app.core.container import Container
from app.services.analytics_service import AnalyticsService
from typing import Dict, Any

router = APIRouter()


@router.post("/track", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
@inject
async def track_event(
    event: TrackEvent,
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    """
    Record a visit/tracking event.
    """
    success = await service.track_event(event)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record event",
        )
    return TrackResponse(status="success", message="Event tracked")


@router.get("/dashboard-metrics", response_model=Dict[str, Any])
@inject
async def get_dashboard_metrics(
    service: AnalyticsService = Depends(Provide[Container.analytics_service])
):
    """
    Get aggregated dashboard metrics (KPIs).
    Includes BigQuery ingestion stats and database counts.
    """
    return await service.get_dashboard_metrics()

@router.get("/top-visited", response_model=Dict[str, Any])
@inject
async def get_top_visited(
    service: AnalyticsService = Depends(Provide[Container.analytics_service])
):
    """
    Get top visited pages/resources.
    Currently returns mock data until visit tracking is implemented.
    """
    return await service.get_top_visited()

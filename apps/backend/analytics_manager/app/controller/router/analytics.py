from typing import Any, Dict

from fastapi import APIRouter, Depends, status

from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.application.usecase.analytics.get_top_visited import GetTopVisitedUseCase
from app.application.usecase.analytics.track_event import TrackEventUseCase
from app.controller.factory.usecase import (get_metrics_usecase,
                                            get_top_visited_usecase,
                                            get_track_event_usecase)
from app.controller.schemas.analytics import TrackEventRequest, TrackResponse

router = APIRouter()


@router.post(
    "/track", response_model=TrackResponse, status_code=status.HTTP_201_CREATED
)
async def track_event(
    req: TrackEventRequest,
    uc: TrackEventUseCase = Depends(get_track_event_usecase),
):
    """Deprecated: frontend now calls lineage-manager directly for visit tracking."""
    await uc.execute(None)
    return TrackResponse(status="success", message="Event tracked")


@router.get("/dashboard-metrics", response_model=Dict[str, Any])
async def get_dashboard_metrics(
    uc: GetMetricsUseCase = Depends(get_metrics_usecase),
):
    ids = ["total_jobs", "active_users", "total_tables", "failed_24h"]
    metrics = await uc.execute(ids)

    return {
        "total_jobs": next((m.count for m in metrics if str(m.id) == "total_jobs"), 0),
        "active_users": next(
            (m.count for m in metrics if str(m.id) == "active_users"), 0
        ),
        "total_tables": next(
            (m.count for m in metrics if str(m.id) == "total_tables"), 0
        ),
        "failed_24h": next((m.count for m in metrics if str(m.id) == "failed_24h"), 0),
    }


@router.get("/top-visited", response_model=Dict[str, Any])
async def get_top_visited(
    uc: GetTopVisitedUseCase = Depends(get_top_visited_usecase),
):
    return await uc.execute()

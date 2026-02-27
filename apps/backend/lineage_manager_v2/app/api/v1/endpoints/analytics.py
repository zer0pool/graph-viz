from fastapi import APIRouter, Depends
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.services.analytics_service import AnalyticsService
from app.api.v1.schemas.analytics import DashboardMetricsResponse

router = APIRouter()

@router.get("/dashboard-metrics", response_model=DashboardMetricsResponse)
@inject
async def get_dashboard_metrics(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    return await service.get_dashboard_metrics()

from typing import Any, Dict

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, status

from app.core.container import Container
from app.domain.analytics.service import AnalyticsService

router = APIRouter()


@router.get("/summary/overview", response_model=Dict[str, Any])
@inject
async def get_overview_summary(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    """
    Get aggregated overview metrics for the dashboard landing page.
    """
    return await service.get_overview_summary()


@router.get("/summary/jobs", response_model=Dict[str, Any])
@inject
async def get_jobs_summary(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    """
    Get metrics for the jobs landing page.
    """
    return await service.get_jobs_summary()


@router.get("/summary/tables", response_model=Dict[str, Any])
@inject
async def get_tables_summary(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    """
    Get metrics for the tables landing page.
    """
    return await service.get_tables_summary()


@router.get("/summary/users", response_model=Dict[str, Any])
@inject
async def get_users_summary(
    service: AnalyticsService = Depends(Provide[Container.analytics_service]),
):
    """
    Get metrics for the users landing page.
    """
    return await service.get_users_summary()

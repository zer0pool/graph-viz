from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.controller.factory.usecase import get_metrics_usecase
from app.domain.entity.analytics import MetricGroup

router = APIRouter()


def _map_to_rest(m: MetricGroup) -> Dict[str, Any]:
    """Maps Domain MetricGroup to legacy REST format for the UI."""
    return {
        "type": str(m.id),
        "label": m.label,
        "value": (
            m.count if m.count is not None else (m.sum if m.sum is not None else 0)
        ),
        "status": m.status,
        "breakdown": (
            [
                {"label": b.label, "value": b.value, "color": b.color}
                for b in (m.breakdown or [])
            ]
            if m.breakdown
            else None
        ),
    }


@router.get("/summary/overview", response_model=Dict[str, Any])
async def get_overview_summary(
    uc: GetMetricsUseCase = Depends(get_metrics_usecase),
):
    metrics = await uc.get_overview_summary()
    return {"metrics": [_map_to_rest(m) for m in metrics]}


@router.get("/summary/jobs", response_model=Dict[str, Any])
async def get_jobs_summary(
    uc: GetMetricsUseCase = Depends(get_metrics_usecase),
):
    metrics = await uc.get_jobs_summary()
    return {"metrics": [_map_to_rest(m) for m in metrics]}


@router.get("/summary/tables", response_model=Dict[str, Any])
async def get_tables_summary(
    uc: GetMetricsUseCase = Depends(get_metrics_usecase),
):
    metrics = await uc.get_tables_summary()
    return {"metrics": [_map_to_rest(m) for m in metrics]}


@router.get("/summary/users", response_model=Dict[str, Any])
async def get_users_summary(
    uc: GetMetricsUseCase = Depends(get_metrics_usecase),
):
    metrics = await uc.get_users_summary()
    return {"metrics": [_map_to_rest(m) for m in metrics]}

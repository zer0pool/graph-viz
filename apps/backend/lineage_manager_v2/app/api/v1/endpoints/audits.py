from datetime import datetime
from typing import List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.schemas.graph import CommandResponse
from app.core.container import Container
from app.services.audit_service import AuditService
from app.tasks.access_log_tasks import flush_access_logs

router = APIRouter()


class AuditEvent(BaseModel):
    id: str
    description: str
    status: str
    timestamp: str


class AuditCommand(BaseModel):
    id: str
    timestamp: str
    type: str
    summary: str
    actor: str
    status: str
    duration: Optional[float] = None
    incidentId: Optional[str] = None
    relatedInfo: Optional[str] = None
    events: List[AuditEvent] = []


@router.get("", response_model=List[AuditCommand])
@inject
async def list_audits(
    limit: int = 100, service: AuditService = Depends(Provide[Container.audit_service])
):
    return await service.list_recent_audits(limit=limit)


@router.post("/access-logs/flush", response_model=CommandResponse)
async def flush_access_logs_endpoint():
    """
    Manually triggers the access log flush task.
    Useful when Celery beat is not running or for on-demand flushing.
    """
    task = flush_access_logs.delay()
    return CommandResponse(
        status="accepted",
        task_id=task.id,
        message="Access log flush task queued",
    )

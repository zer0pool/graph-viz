from datetime import datetime
from typing import List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.container import Container
from app.services.audit_service import AuditService

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
    incidentId: Optional[str] = None
    relatedInfo: Optional[str] = None
    events: List[AuditEvent] = []


@router.get("", response_model=List[AuditCommand])
@inject
async def list_audits(
    limit: int = 100, service: AuditService = Depends(Provide[Container.audit_service])
):
    return await service.list_recent_audits(limit=limit)

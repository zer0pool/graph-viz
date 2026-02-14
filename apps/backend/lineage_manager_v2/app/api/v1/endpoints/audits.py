from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.services.audit_service import AuditService

router = APIRouter()


class AuditLog(BaseModel):
    id: int
    command_type: str
    target_id: Optional[str]
    performed_by: str
    status: str
    visited_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLog])
@inject
async def list_audits(
    limit: int = 100, service: AuditService = Depends(Provide[Container.audit_service])
):
    return await service.list_recent_audits(limit=limit)

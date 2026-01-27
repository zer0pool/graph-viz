from fastapi import APIRouter, Depends, HTTPException, Body
from dependency_injector.wiring import inject, Provide
from typing import Optional
from pydantic import BaseModel

from lineage_manager.core.container import GraphContainer
from lineage_manager.services.audit_service import AuditService
from lineage_manager.services.command_execution_service import CommandExecutionService
from lineage_manager.api.v1.auth import require_authenticated_user

router = APIRouter(prefix="/audit", tags=["Audit"])

AUTH_DEPS = [Depends(require_authenticated_user)]


class SendEmailRequest(BaseModel):
    message: str


@router.get("/commands")
@inject
async def list_audit_commands(
    limit: int = 50,
    offset: int = 0,
    range: Optional[str] = "24h",  # Frontend sends this but we ignore for now
    audit_service: AuditService = Depends(Provide[GraphContainer.audit.audit_service]),
):
    """
    List audit command history.
    Returns data in format compatible with AuditLanding frontend.
    """
    commands = audit_service.list_commands(limit=limit, offset=offset)
    return commands


@router.post("/commands/pause-job/{job_id}")
@inject
async def pause_job(
    job_id: str,
    current_user: dict = Depends(require_authenticated_user),
    command_service: CommandExecutionService = Depends(
        Provide[GraphContainer.audit.command_execution_service]
    ),
):
    """Pause (disable) a job."""
    user_id = current_user.get("user_id", "unknown")
    result = command_service.pause_job(job_id, user_id)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return result


@router.post("/commands/resume-job/{job_id}")
@inject
async def resume_job(
    job_id: str,
    current_user: dict = Depends(require_authenticated_user),
    command_service: CommandExecutionService = Depends(
        Provide[GraphContainer.audit.command_execution_service]
    ),
):
    """Resume (enable) a job."""
    user_id = current_user.get("user_id", "unknown")
    result = command_service.resume_job(job_id, user_id)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return result


@router.post("/commands/send-email/{job_id}")
@inject
async def send_email(
    job_id: str,
    request: SendEmailRequest = Body(...),
    current_user: dict = Depends(require_authenticated_user),
    command_service: CommandExecutionService = Depends(
        Provide[GraphContainer.audit.command_execution_service]
    ),
):
    """Send email notification for a job."""
    user_id = current_user.get("user_id", "unknown")
    result = command_service.send_email(job_id, user_id, request.message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return result

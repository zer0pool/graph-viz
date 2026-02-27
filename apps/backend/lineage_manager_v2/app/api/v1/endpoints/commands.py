from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.tasks.graph_tasks import send_notification_email_task
from app.api.v1.schemas.graph import CommandResponse

router = APIRouter()


class EmailRequest(BaseModel):
    recipient: str
    subject: str
    body: str


@router.post("/send-email", response_model=CommandResponse)
async def send_email(data: EmailRequest):
    """
    Triggers a background task to send an email.
    """
    task = send_notification_email_task.delay(data.recipient, data.subject, data.body)
    return CommandResponse(
        status="accepted", task_id=task.id, message="Email task queued"
    )

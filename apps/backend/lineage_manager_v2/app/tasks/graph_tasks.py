import asyncio
import traceback

from app.api.v1.schemas.graph import CommandResponse
from app.core.celery_app import celery_app
from app.core.container import Container
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService


@celery_app.task(name="app.tasks.graph_tasks.initialize_graph_task", bind=True)
def initialize_graph_task(self, drop_existing: bool = False):
    """
    Celery task to run graph initialization/discovery.
    """

    async def _run():
        container = Container()
        graph_service = container.graph_service()
        audit_service = container.audit_service()
        try:
            result = await graph_service.initialize_graph(drop_existing)
            await audit_service.log_command(
                command_type="INITIALIZE_GRAPH",
                target_id="all",
                performed_by="system",
                status="SUCCESS",
                payload={"drop_existing": drop_existing},
            )
            return {"status": "success", "result": result}
        except Exception as e:
            traceback.print_exc()
            await audit_service.log_command(
                command_type="INITIALIZE_GRAPH",
                target_id="all",
                performed_by="system",
                status="FAILED",
                error_message=str(e),
            )
            raise e

    try:
        return asyncio.run(_run())
    except Exception as e:
        self.retry(exc=e, countdown=60, max_retries=3)
        return {"status": "error", "message": str(e)}


@celery_app.task(name="app.tasks.graph_tasks.pause_job_task", bind=True)
def pause_job_task(self, job_id: str, user_id: str):
    async def _run():
        container = Container()
        graph_service = container.graph_service()
        audit_service = container.audit_service()
        success = await graph_service.job_manager_client.pause_job(job_id)
        status = "SUCCESS" if success else "FAILED"
        await audit_service.log_command(
            command_type="PAUSE_JOB",
            target_id=job_id,
            performed_by=user_id,
            status=status,
        )
        return {"status": status, "job_id": job_id}

    try:
        return asyncio.run(_run())
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


@celery_app.task(name="app.tasks.graph_tasks.resume_job_task", bind=True)
def resume_job_task(self, job_id: str, user_id: str):
    async def _run():
        container = Container()
        graph_service = container.graph_service()
        audit_service = container.audit_service()
        success = await graph_service.job_manager_client.resume_job(job_id)
        status = "SUCCESS" if success else "FAILED"
        await audit_service.log_command(
            command_type="RESUME_JOB",
            target_id=job_id,
            performed_by=user_id,
            status=status,
        )
        return {"status": status, "job_id": job_id}

    try:
        return asyncio.run(_run())
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


@celery_app.task(name="app.tasks.graph_tasks.send_notification_email_task", bind=True)
def send_notification_email_task(self, recipient: str, subject: str, body: str):
    """Mock email task."""
    print(f"--- MOCK EMAIL ---")
    print(f"To: {recipient}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print(f"------------------")
    return {"status": "SUCCESS", "to": recipient}

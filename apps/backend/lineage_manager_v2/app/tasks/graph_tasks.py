import asyncio
import traceback

from app.api.v1.schemas.graph import CommandResponse
from app.core.celery_app import celery_app
from app.core.container import Container
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService


@celery_app.task(name="app.tasks.graph_tasks.initialize_graph_task", bind=True)
def initialize_graph_task(
    self, drop_existing: bool = False, user_email: str = "system"
):
    """
    Celery task to run graph initialization/discovery.
    """

    async def _run():
        container = Container()
        graph_service = container.graph_service()
        audit_service = container.audit_service()

        # Create Master Audit Record synchronously so we have the ID to pass to details
        master_id = await audit_service.create_master(
            action_type="GRAPH_INIT",
            target_type="SYSTEM",
            user_email=user_email,
            total_count=0,  # Will update later with stats
            payload={"drop_existing": drop_existing},
        )

        try:
            # Pass audit context to the service
            result = await graph_service.initialize_graph(
                drop_existing=drop_existing,
                audit_service=audit_service,
                audit_parent_id=master_id,
                user_email=user_email,
            )

            # Update Master on success
            if master_id:
                stats = result.get("stats", {})
                total_jobs = stats.get("jobs", 0) + stats.get("failed", 0)
                await audit_service.update_master(
                    audit_id=master_id,
                    status="SUCCESS" if stats.get("failed", 0) == 0 else "PARTIAL",
                    total_count=total_jobs,
                    success_count=stats.get("jobs", 0),
                    fail_count=stats.get("failed", 0),
                    duration=result.get("duration"),
                )

            return {"status": "success", "result": result}
        except Exception as e:
            traceback.print_exc()
            # Update Master on failure
            if master_id:
                await audit_service.update_master(
                    audit_id=master_id, status="FAIL", fail_count=1
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
        import time

        start_time = time.time()
        success = await graph_service.job_manager_client.pause_job(job_id)
        duration = time.time() - start_time
        status = "SUCCESS" if success else "FAILED"
        await audit_service.create_master(
            action_type="PAUSE_JOB",
            target_id=job_id,
            user_email=user_id,
            status=status,
            target_type="JOB",
            total_count=0,
            duration=duration,
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
        import time

        start_time = time.time()
        success = await graph_service.job_manager_client.resume_job(job_id)
        duration = time.time() - start_time
        status = "SUCCESS" if success else "FAILED"
        await audit_service.create_master(
            action_type="RESUME_JOB",
            target_id=job_id,
            user_email=user_id,
            status=status,
            target_type="JOB",
            total_count=0,
            duration=duration,
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

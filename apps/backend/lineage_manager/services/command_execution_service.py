import logging
from typing import Any, Dict

from lineage_manager.api.v1.schemas import JobUpdateRequest
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class CommandExecutionService:
    """
    Service for executing operational commands (Pause, Resume, Email)
    and logging them to the Audit Log.
    """

    def __init__(
        self,
        graph_uow: GraphUnitOfWork,
        command_service: GraphCommandService,
        audit_service: AuditService,
    ):
        self.graph_uow = graph_uow
        self.command_service = command_service
        self.audit_service = audit_service

    def pause_job(self, job_id: str, user_id: str) -> Dict[str, Any]:
        """Pause (disable) a job."""
        return self._execute_job_state_change(
            job_id, user_id, "PAUSE_JOB", enabled=False
        )

    def resume_job(self, job_id: str, user_id: str) -> Dict[str, Any]:
        """Resume (enable) a job."""
        return self._execute_job_state_change(
            job_id, user_id, "RESUME_JOB", enabled=True
        )

    def send_email(self, job_id: str, user_id: str, message: str) -> Dict[str, Any]:
        """Send an email notification about a job."""
        try:
            # Mock email sending logic
            logger.info(f"Sending email for Job {job_id} by {user_id}: {message}")

            # TODO: Integrate with actual email service (e.g. SMTP, SES)
            success = True

            # Log Audit (independent transaction)
            self.audit_service.log_command(
                command_type="SEND_EMAIL",
                target_id=job_id,
                performed_by=user_id,
                status="SUCCESS" if success else "FAILURE",
                payload={"message": message},
            )

            return {
                "status": "success",
                "job_id": job_id,
                "action": "send_email",
                "message": "Email sent successfully (mock)",
            }
        except Exception as e:
            logger.error(f"Failed to send email for {job_id}: {e}")
            self.audit_service.log_command(
                command_type="SEND_EMAIL",
                target_id=job_id,
                performed_by=user_id,
                status="FAILURE",
                error_message=str(e),
                payload={"message": message},
            )
            return {"status": "error", "message": str(e)}

    def _execute_job_state_change(
        self, job_id: str, user_id: str, command_type: str, enabled: bool
    ) -> Dict[str, Any]:
        """Helper to update job state and log audit."""
        try:
            # 1. Update Job (Graph transaction)
            with self.graph_uow.transactional():
                payload = JobUpdateRequest(enabled=enabled)
                result = self.command_service.update_job(job_id, payload)

                if not result:
                    raise ValueError(f"Job {job_id} not found")

            # 2. Log Audit (separate transaction - always persists)
            self.audit_service.log_command(
                command_type=command_type,
                target_id=job_id,
                performed_by=user_id,
                status="SUCCESS",
                payload={"enabled": enabled},
            )

            return {
                "status": "success",
                "job_id": job_id,
                "action": command_type.lower(),
                "enabled": enabled,
            }
        except Exception as e:
            logger.error(f"Failed to execute {command_type} for {job_id}: {e}")

            # Log failure audit (independent transaction)
            try:
                self.audit_service.log_command(
                    command_type=command_type,
                    target_id=job_id,
                    performed_by=user_id,
                    status="FAILURE",
                    error_message=str(e),
                    payload={"enabled": enabled},
                )
            except Exception as audit_err:
                logger.error(f"Failed to log audit failure: {audit_err}")

            return {"status": "error", "message": str(e)}

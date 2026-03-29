import json
import logging
from typing import Any, Dict, List, Optional

from app.infrastructure.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def list_recent_audits(self, limit: int = 100) -> List[Any]:
        async with self.uow:
            # We fetch top-level audits (Master records)
            masters = await self.uow.audits.list_recent_masters(limit=limit)

            result = []
            for master in masters:
                # Fetch details for each master
                details = await self.uow.audits.list_details_by_master(master.id)
                formatted = self._format_audit_log(master, details)
                result.append(formatted)

            return result

    def _format_audit_log(self, log: Any, details: Optional[List[Any]] = None):
        payload = {}
        if log.payload:
            if isinstance(log.payload, dict):
                payload = log.payload
            elif isinstance(log.payload, (str, bytes)):
                try:
                    payload = json.loads(log.payload)
                except:
                    payload = {}
            else:
                payload = {}

        summary = f"{log.action} on {log.target_id}"
        if log.action == "UPDATE_USER_ROLES":
            old = payload.get("old_roles", [])
            new = payload.get("new_roles", [])
            summary = f"Updated roles for user '{log.target_id}': {old} -> {new}"
        elif log.action == "PAUSE_JOB":
            summary = f"Paused job '{log.target_id}'"
        elif log.action == "RESUME_JOB":
            summary = f"Resumed job '{log.target_id}'"
        elif log.action == "GRAPH_INIT":
            summary = "Graph initialization / discovery"

        events = []
        if details:
            for d in details:
                # Use task_name if available, fallback to target_id or description
                desc = (
                    d.error_message
                    if d.error_message
                    else f"{d.action} on {d.target_id}"
                )
                if d.action == "GRAPH_INIT_JOB":
                    desc = f"Processed job: {d.target_id}"

                events.append(
                    {
                        "id": str(d.id),
                        "description": desc,
                        "status": d.status,
                        "timestamp": d.timestamp.isoformat() + "Z",
                    }
                )
        elif log.action == "UPDATE_USER_ROLES":
            # Backward compatibility or fallback for simple records without details
            events.append(
                {
                    "id": str(log.id),
                    "description": summary,
                    "status": log.status,
                    "timestamp": log.timestamp.isoformat() + "Z",
                }
            )

        return {
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() + "Z",
            "type": log.action,
            "summary": summary,
            "actor": log.user_email,
            "status": log.status,
            "duration": round(log.duration, 1) if log.duration is not None else None,
            "events": events,
            "stats": {
                "total": log.total_count,
                "success": log.success_count,
                "fail": log.fail_count,
            },
        }

    def log_command(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str,
        target_type: str = "SYSTEM",
        payload: Optional[dict] = None,
        error_message: Optional[str] = None,
        duration: Optional[float] = None,
    ):
        """
        Legacy-compatible method that now dispatches asynchronously.
        For simple operations, it creates a Master record with the final status.
        """
        self.dispatch_create_master(
            action_type=command_type,
            user_email=performed_by,
            target_id=target_id,
            target_type=target_type,
            status=status,
            payload=payload,
            total_count=0,
            duration=duration,
        )

    async def create_master(
        self,
        action_type: str,
        user_email: str,
        target_type: str = "SYSTEM",
        total_count: int = 0,
        payload: Optional[dict] = None,
        status: str = "PENDING",
        target_id: Optional[str] = None,
        duration: Optional[float] = None,
    ) -> int:
        async with self.uow:
            model = await self.uow.audits.create_master(
                action=action_type,
                target_type=target_type,
                user_email=user_email,
                total_count=total_count,
                payload=payload,
                status=status,
                target_id=target_id,
                duration=duration,
            )
            await self.uow.commit()
            return model.id

    async def bulk_create_details(
        self,
        parent_id: int,
        action_type: str,
        user_email: str,
        targets: List[str],
        target_type: str = "SYSTEM",
        status: str = "INITIATED",
        message: Optional[str] = None,
    ) -> int:
        async with self.uow:
            count = await self.uow.audits.bulk_create_details(
                parent_id=parent_id,
                action=action_type,
                target_type=target_type,
                user_email=user_email,
                targets=targets,
                status=status,
                message=message,
            )
            await self.uow.commit()
            return count

    def dispatch_create_master(
        self,
        action_type: str,
        user_email: str,
        target_id: Optional[str] = None,
        target_type: str = "SYSTEM",
        total_count: int = 0,
        payload: Optional[dict] = None,
        status: str = "PENDING",
        duration: Optional[float] = None,
    ):
        from app.core.celery_app import celery_app

        celery_app.send_task(
            "app.tasks.audit_tasks.process_audit",
            kwargs={
                "action": "CREATE_MASTER",
                "action_type": action_type,
                "user_email": user_email,
                "target_id": target_id,
                "target_type": target_type,
                "total_count": total_count,
                "payload": payload,
                "status": status,
                "duration": duration,
            },
        )

    def dispatch_bulk_create_details(
        self,
        parent_id: int,
        action_type: str,
        user_email: str,
        targets: List[str],
        target_type: str = "SYSTEM",
        status: str = "INITIATED",
        message: Optional[str] = None,
    ):
        from app.core.celery_app import celery_app

        try:
            logger.info(f"Dispatching BULK_CREATE_DETAILS for {len(targets)} targets")
            task = celery_app.send_task(
                "app.tasks.audit_tasks.process_audit",
                kwargs={
                    "action": "BULK_CREATE_DETAILS",
                    "parent_id": parent_id,
                    "action_type": action_type,
                    "user_email": user_email,
                    "targets": targets,
                    "target_type": target_type,
                    "status": status,
                    "message": message,
                },
            )
            logger.info(
                f"Successfully dispatched BULK_CREATE_DETAILS (Task ID: {task.id})"
            )
        except Exception as e:
            logger.error(f"Failed to dispatch BULK_CREATE_DETAILS: {e}")

    def dispatch_update_master(
        self,
        audit_id: int,
        status: str,
        total_count: Optional[int] = None,
        success_count: Optional[int] = None,
        fail_count: Optional[int] = None,
        duration: Optional[float] = None,
    ):
        from app.core.celery_app import celery_app

        try:
            logger.info(f"Dispatching UPDATE_MASTER for audit_id {audit_id}")
            task = celery_app.send_task(
                "app.tasks.audit_tasks.process_audit",
                kwargs={
                    "action": "UPDATE_MASTER",
                    "audit_id": audit_id,
                    "status": status,
                    "total_count": total_count,
                    "success_count": success_count,
                    "fail_count": fail_count,
                    "duration": duration,
                },
            )
            logger.info(f"Successfully dispatched UPDATE_MASTER (Task ID: {task.id})")
        except Exception as e:
            logger.error(f"Failed to dispatch UPDATE_MASTER: {e}")

    async def update_detail(
        self,
        parent_id: int,
        target_id: str,
        status: str,
        message: Optional[str] = None,
    ):
        async with self.uow:
            await self.uow.audits.update_detail_status(
                parent_id=parent_id,
                target_id=target_id,
                status=status,
                message=message,
            )
            await self.uow.commit()

    async def update_master(
        self,
        audit_id: int,
        status: str,
        total_count: Optional[int] = None,
        success_count: Optional[int] = None,
        fail_count: Optional[int] = None,
        duration: Optional[float] = None,
    ):
        async with self.uow:
            await self.uow.audits.update_master_status(
                audit_id=audit_id,
                status=status,
                total_count=total_count,
                success_count=success_count,
                fail_count=fail_count,
                duration=duration,
            )
            await self.uow.commit()

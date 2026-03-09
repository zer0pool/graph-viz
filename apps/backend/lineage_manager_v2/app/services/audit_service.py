from typing import Any, List

from app.infrastructure.unit_of_work import UnitOfWork


class AuditService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def list_recent_audits(self, limit: int = 100) -> List[Any]:
        async with self.uow:
            logs = await self.uow.audits.list_recent(limit=limit)
            return [self._format_audit_log(log) for log in logs]

    def _format_audit_log(self, log):
        import json

        payload = {}
        if log.payload:
            try:
                payload = (
                    json.loads(log.payload)
                    if isinstance(log.payload, str)
                    else log.payload
                )
            except:
                pass

        summary = f"{log.command_type} on {log.target_id}"
        if log.command_type == "UPDATE_USER_ROLES":
            old = payload.get("old_roles", [])
            new = payload.get("new_roles", [])
            summary = f"Updated roles for user '{log.target_id}': {old} -> {new}"
        elif log.command_type == "PAUSE_JOB":
            summary = f"Paused job '{log.target_id}'"
        elif log.command_type == "RESUME_JOB":
            summary = f"Resumed job '{log.target_id}'"

        events = []
        if log.command_type == "UPDATE_USER_ROLES":
            events.append(
                {
                    "id": str(log.id),
                    "description": summary,
                    "status": log.status,
                    "timestamp": log.visited_at.isoformat() + "Z",
                }
            )

        return {
            "id": str(log.id),
            "timestamp": log.visited_at.isoformat() + "Z",
            "type": log.command_type,
            "summary": summary,
            "actor": log.performed_by,
            "status": log.status,
            "events": events,
        }

    async def log_command(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str,
        payload: dict = None,
        error_message: str = None,
    ):
        async with self.uow:
            await self.uow.audits.create(
                command_type=command_type,
                target_id=target_id,
                performed_by=performed_by,
                status=status,
                payload=payload,
                error_message=error_message,
            )
            await self.uow.commit()

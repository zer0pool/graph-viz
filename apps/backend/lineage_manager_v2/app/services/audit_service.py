from typing import Any, List

from app.infrastructure.unit_of_work import UnitOfWork


class AuditService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def list_recent_audits(self, limit: int = 100) -> List[Any]:
        async with self.uow:
            return await self.uow.audits.list_recent(limit=limit)

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

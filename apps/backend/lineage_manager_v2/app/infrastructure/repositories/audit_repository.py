from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.audit.entities import AuditLog as AuditLogEntity
from app.infrastructure.models import AuditLog as AuditLogModel


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, entity: AuditLogEntity) -> AuditLogEntity:
        model = AuditLogModel(
            command_type=entity.command_type,
            target_id=entity.target_id,
            payload=entity.payload,
            performed_by=entity.performed_by,
            status=entity.status,
            error_message=entity.error_message,
        )
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        entity.id = model.id
        entity.visited_at = model.visited_at
        return entity

    async def create(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str,
        payload: dict = None,
        error_message: str = None,
    ) -> AuditLogModel:
        import json

        payload_str = json.dumps(payload) if payload else None
        model = AuditLogModel(
            command_type=command_type,
            target_id=target_id,
            performed_by=performed_by,
            status=status,
            payload=payload_str,
            error_message=error_message,
        )
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        return model

    async def list_recent(self, limit: int = 100) -> List[AuditLogEntity]:
        query = (
            select(AuditLogModel).order_by(AuditLogModel.visited_at.desc()).limit(limit)
        )
        result = await self.db.execute(query)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def count(self) -> int:
        from sqlalchemy import func
        result = await self.db.execute(select(func.count()).select_from(AuditLogModel))
        return result.scalar() or 0

    def _to_entity(self, model: AuditLogModel) -> AuditLogEntity:
        return AuditLogEntity(
            id=model.id,
            command_type=model.command_type,
            target_id=model.target_id,
            payload=model.payload,
            performed_by=model.performed_by,
            status=model.status,
            error_message=model.error_message,
            visited_at=model.visited_at,
        )

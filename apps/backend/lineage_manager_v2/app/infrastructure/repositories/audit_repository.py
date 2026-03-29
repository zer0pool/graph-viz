from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.audit.entities import AuditLog as AuditLogEntity
from app.infrastructure.models import AuditLog as AuditLogModel


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, entity: AuditLogEntity) -> AuditLogEntity:
        model = AuditLogModel(
            action=entity.action if entity.action != "UNKNOWN" else entity.command_type,
            target_id=entity.target_id,
            payload=entity.payload,
            user_email=(
                entity.user_email
                if entity.user_email != "system"
                else entity.performed_by
            ),
            target_type=entity.target_type,
            status=entity.status,
            error_message=entity.error_message,
            total_count=entity.total_count,
            success_count=entity.success_count,
            fail_count=entity.fail_count,
        )
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        entity.id = int(model.id) if model.id is not None else None
        entity.timestamp = (
            model.timestamp if model.timestamp is not None else datetime.now()
        )
        return entity

    async def create(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str,
        payload: Optional[dict] = None,
        error_message: Optional[str] = None,
        target_type: str = "SYSTEM",
    ) -> AuditLogModel:
        model = AuditLogModel(
            action=command_type,
            target_id=target_id,
            user_email=performed_by,
            target_type=target_type,
            status=status,
            payload=payload,
            error_message=error_message,
            total_count=0,
            success_count=0,
            fail_count=0,
        )
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        return model

    async def list_recent(self, limit: int = 100) -> List[AuditLogEntity]:
        query = (
            select(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).limit(limit)
        )
        result = await self.db.execute(query)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def list_recent_masters(self, limit: int = 100) -> List[AuditLogEntity]:
        query = (
            select(AuditLogModel)
            .filter_by(parent_id=None)
            .order_by(AuditLogModel.timestamp.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def list_details_by_master(self, parent_id: int) -> List[AuditLogEntity]:
        query = (
            select(AuditLogModel)
            .filter_by(parent_id=parent_id)
            .order_by(AuditLogModel.timestamp.asc())
        )
        result = await self.db.execute(query)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def count(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count()).select_from(AuditLogModel))
        return result.scalar() or 0

    async def create_master(
        self,
        action: str,
        target_type: str,
        user_email: str,
        total_count: int = 0,
        payload: Optional[dict] = None,
        status: str = "PENDING",
        target_id: Optional[str] = None,
        duration: Optional[float] = None,
    ) -> AuditLogModel:
        model = AuditLogModel(
            parent_id=None,
            action=action,
            target_type=target_type,
            user_email=user_email,
            target_id=target_id,
            status=status,
            payload=payload,
            total_count=total_count,
            success_count=total_count if status == "SUCCESS" else 0,
            fail_count=0,
            duration=duration,
        )
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        return model

    async def bulk_create_details(
        self,
        parent_id: int,
        action: str,
        target_type: str,
        user_email: str,
        targets: List[str],
        status: str = "INITIATED",
        message: Optional[str] = None,
    ) -> int:
        models = [
            AuditLogModel(
                parent_id=parent_id,
                action=action,
                target_type=target_type,
                user_email=user_email,
                target_id=target,
                task_name=target,
                status=status,
                error_message=message,
                total_count=0,
                success_count=0,
                fail_count=0,
            )
            for target in targets
        ]
        self.db.add_all(models)
        await self.db.flush()
        return len(models)

    async def update_detail_status(
        self,
        parent_id: int,
        target_id: str,
        status: str,
        message: Optional[str] = None,
    ) -> bool:
        from datetime import datetime

        result = await self.db.execute(
            select(AuditLogModel).filter_by(parent_id=parent_id, target_id=target_id)
        )
        model = result.scalar_one_or_none()

        if model:
            # Status Transition Guard: Don't overwrite final states with intermediate ones
            if model.status in ("SUCCESS", "FAIL") and status in (
                "PROCESSING",
                "INITIATED",
                "PENDING",
            ):
                return True

            model.status = status
            if message:
                model.error_message = message
            model.timestamp = datetime.utcnow()
            self.db.add(model)
            await self.db.flush()
            return True
        return False

    async def update_master_status(
        self,
        audit_id: int,
        status: str,
        total_count: Optional[int] = None,
        success_count: Optional[int] = None,
        fail_count: Optional[int] = None,
        duration: Optional[float] = None,
    ) -> bool:
        from datetime import datetime

        result = await self.db.execute(
            select(AuditLogModel).filter_by(id=audit_id, parent_id=None)
        )
        model = result.scalar_one_or_none()

        if model:
            # Status Transition Guard
            if model.status in ("SUCCESS", "FAIL") and status in (
                "PROCESSING",
                "PENDING",
            ):
                return True

            model.status = status
            if total_count is not None:
                model.total_count = total_count
            if success_count is not None:
                model.success_count = success_count
            if fail_count is not None:
                model.fail_count = fail_count
            if duration is not None:
                model.duration = duration
            model.timestamp = datetime.utcnow()
            self.db.add(model)
            await self.db.flush()
            return True
        return False

    def _to_entity(self, model: AuditLogModel) -> AuditLogEntity:
        return AuditLogEntity(
            id=int(model.id) if model.id is not None else None,
            action=str(model.action),
            target_type=str(model.target_type),
            user_email=str(model.user_email),
            target_id=str(model.target_id) if model.target_id is not None else None,
            task_name=str(model.task_name) if model.task_name is not None else None,
            parent_id=int(model.parent_id) if model.parent_id is not None else None,
            total_count=int(model.total_count) if model.total_count is not None else 0,
            success_count=(
                int(model.success_count) if model.success_count is not None else 0
            ),
            fail_count=int(model.fail_count) if model.fail_count is not None else 0,
            payload=model.payload,  # JSON stays as dict/list
            status=str(model.status),
            error_message=(
                str(model.error_message) if model.error_message is not None else None
            ),
            timestamp=model.timestamp,
            duration=float(model.duration) if model.duration is not None else None,
            # Backward compatibility temporary defaults
            command_type=str(model.action),
            performed_by=str(model.user_email),
        )

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.user.entities import User as UserEntity
from app.infrastructure.models import UserAccount as UserModel


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: str) -> Optional[UserEntity]:
        result = await self.db.execute(
            select(UserModel).where(UserModel.user_id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_sub(self, sub: str) -> Optional[UserEntity]:
        result = await self.db.execute(select(UserModel).where(UserModel.sub == sub))
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def save(self, entity: UserEntity) -> UserEntity:
        query = select(UserModel).where(UserModel.user_id == entity.user_id)
        result = await self.db.execute(query)
        model = result.scalar_one_or_none()

        if model:
            # Update
            model.email = entity.email
            model.name = entity.name
            model.roles = entity.roles
            model.department = entity.department
            model.status = entity.status
            model.last_login_at = entity.last_login_at
        else:
            # Create
            model = UserModel(
                user_id=entity.user_id,
                sub=entity.sub,
                login_id=entity.login_id or entity.user_id,
                email=entity.email,
                name=entity.name,
                roles=entity.roles,
                department=entity.department,
                status=entity.status,
            )
            self.db.add(model)

        await self.db.flush()
        await self.db.refresh(model)
        return self._to_entity(model)

    async def count(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count()).select_from(UserModel))
        return result.scalar() or 0

    async def list_all(self, limit: int = 10, offset: int = 0) -> List[UserEntity]:
        stmt = select(UserModel).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def search_by_name_prefix(self, prefix: str, limit: int = 10) -> List[str]:
        query = (
            select(UserModel.name)
            .where(UserModel.name.ilike(f"%{prefix}%"))
            .distinct()
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    def _to_entity(self, model: UserModel) -> UserEntity:
        return UserEntity(
            user_id=model.user_id,
            sub=model.sub,
            login_id=model.login_id,
            email=model.email,
            name=model.name,
            roles=model.roles or [],
            department=model.department,
            status=model.status,
            last_login_at=model.last_login_at,
            id=model.id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

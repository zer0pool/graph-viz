from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import ApiAccessLog


class AccessLogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def bulk_insert(self, records: List[dict]) -> int:
        """Insert a list of access log dicts and return the count inserted."""
        models = [ApiAccessLog(**r) for r in records]
        self.db.add_all(models)
        await self.db.flush()
        return len(models)

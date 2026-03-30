from datetime import datetime, timedelta
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import PageVisit


class PageVisitRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record(
        self, path: str, title: str | None, visitor_id: str | None
    ) -> None:
        visit = PageVisit(path=path, title=title, visitor_id=visitor_id)
        self.db.add(visit)
        await self.db.flush()

    async def get_top_visited(self, limit: int = 5, days: int = 7) -> List[dict]:
        since = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(PageVisit.path, PageVisit.title, func.count().label("count"))
            .where(PageVisit.visited_at >= since)
            .group_by(PageVisit.path, PageVisit.title)
            .order_by(func.count().desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        # Merge duplicate paths that have different titles, keep the most common title
        merged: dict[str, dict] = {}
        for path, title, count in rows:
            if path not in merged:
                merged[path] = {"path": path, "title": title, "count": count}
            else:
                merged[path]["count"] += count

        return sorted(merged.values(), key=lambda x: x["count"], reverse=True)[:limit]

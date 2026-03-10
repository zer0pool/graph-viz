from typing import Any, Dict

from redis.asyncio import Redis


class GetTopVisitedUseCase:
    TITLE_MAP = {
        "/": "dashboard",
        "/projects": "projects",
        "/users": "users",
        "/jobs": "jobs",
        "/tables": "tables",
        "/lineage": "lineage",
        "/audit": "audit",
        "/settings": "settings",
    }

    def __init__(self, redis: Redis):
        self.redis = redis

    async def execute(self) -> Dict[str, Any]:
        visit_key = "analytics:path_visits"
        top_paths = await self.redis.zrevrange(visit_key, 0, 4, withscores=True)

        items = []
        for path_bytes, score in top_paths:
            path = path_bytes.decode() if isinstance(path_bytes, bytes) else path_bytes
            title = self.TITLE_MAP.get(path)
            if not title:
                title = path.strip("/").split("/")[0] or "dashboard"
            items.append({"path": path, "title": title, "count": int(score)})

        return {"items": items, "window_hours": 168}

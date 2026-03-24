from typing import Any, Dict

from app.infrastructure.lineage_client import LineageClient


class GetTopVisitedUseCase:
    def __init__(self, lineage_client: LineageClient):
        self.lineage_client = lineage_client

    async def execute(self, limit: int = 5, days: int = 7) -> Dict[str, Any]:
        return await self.lineage_client.get_top_visited(limit=limit, days=days)

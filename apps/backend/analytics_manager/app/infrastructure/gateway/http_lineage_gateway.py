import logging
from typing import Any, Dict, List

from app.domain.gateway.lineage_gateway import LineageGateway
from app.infrastructure.lineage_client import LineageClient

logger = logging.getLogger(__name__)


class HttpLineageGateway(LineageGateway):
    """
    Bridge connecting Domain layer with HTTP LineageService.
    Re-uses the existing `LineageClient` for network boundaries.
    """

    def __init__(self, client: LineageClient):
        self.client = client

    async def get_internal_stats(self) -> Dict[str, Any]:
        return await self.client.get_internal_stats()

    async def get_jobs_batch(self, job_ids: List[str]) -> Dict[str, Any]:
        return await self.client.get_jobs_batch(job_ids)

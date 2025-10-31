from typing import Optional
from src.app.models.graph import Graph, GraphSync
from src.app.repositories.graph_repository import GraphRepository

class GraphService:
    def __init__(self, repository: GraphRepository):
        self.repository = repository

    async def get_upstream_graph(self, job_id: int) -> Optional[Graph]:
        return await self.repository.get_upstream_graph(job_id)

    async def get_downstream_graph(self, job_id: int) -> Optional[Graph]:
        return await self.repository.get_downstream_graph(job_id)

    async def sync_job_data(self, job_id: int) -> GraphSync:
        success = await self.repository.sync_job_data(job_id)
        return GraphSync(
            job_id=job_id,
            status="success" if success else "failure",
            message="Job data synchronized successfully" if success else "Failed to synchronize job data"
        )
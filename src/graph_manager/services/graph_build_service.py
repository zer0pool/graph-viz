from graph_manager.api.v1.schemas import JobRegister
from graph_manager.services.graph_service import GraphService


class GraphBuildService:
    """Write-oriented facade delegating to GraphService (build/sync/reset)."""

    def __init__(self, core: GraphService):
        self.core = core

    def register_job(self, payload: JobRegister) -> str:
        return self.core.register_job(payload)

    def reset_graph(self):
        return self.core.reset_graph()

    async def initialize_graph(self):
        return await self.core.initialize_graph()


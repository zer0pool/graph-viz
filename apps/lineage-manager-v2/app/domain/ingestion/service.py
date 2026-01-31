from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from app.domain.graph.service import GraphService
from app.domain.ingestion.client import JobManagerClient

logger = logging.getLogger(__name__)

class IngestionService:
    """
    Orchestrates ingestion from Job Manager to Graph.
    Replaces V1 GraphSyncService.
    """
    def __init__(self, session: AsyncSession, graph_service: GraphService, client: JobManagerClient):
        self.session = session
        self.graph = graph_service
        self.client = client

    async def sync_job(self, job_id: str) -> bool:
        """
        Fetch a single job and sync its lineage.
        """
        # 1. Fetch
        job_data = await self.client.get_job(job_id)
        if not job_data:
            logger.warning(f"Job {job_id} not found in Manager")
            return False

        # 2. Map & Verify (Simple implementation for now)
        # In V2, we assume 'SchedulingLineage' structure is standardized.
        # We need to extract upstream/downstream and metadata.
        
        # Transaction is effectively managed by the session context handling this call
        # but explicit commit might be needed if not wrapped in endpoint dep.
        
        await self._process_job_payload(job_data)
        return True

    async def _process_job_payload(self, payload: Dict[str, Any]):
        """
        Core logic to register node and edges.
        """
        job_id = payload.get("job_id")
        if not job_id:
            return

        # 1. Provide/Update Job Node
        # Mapping payload to schema is needed here (TODO: schemas.py for ingestion)
        # For now, using raw dict access
        
        # Create Root Node (JOB)
        # We assume project_id is available or derived
        full_name = job_id # simplification
        
        node = await self.graph.get_or_create_node("JOB", full_name)
        
        # TODO: Update Job Metadata (Heavy Leaf)
        # job_leaf = await self.graph.get_or_create_job_leaf(...)
        
        # 2. Process Upstreams (Tables mostly)
        upstreams = payload.get("upstreams", [])
        for up in upstreams:
            # Assuming up is {name: "project.dataset.table", type: "TABLE"}
            up_name = up.get("name")
            up_type = "TABLE" # default or extract
            
            if up_name:
                u_node = await self.graph.get_or_create_node(up_type, up_name)
                # Edge: Table -> Job
                await self.graph.add_dependency(u_node.id, node.id, type="LINEAGE")

        # 3. Process Downstreams (Tables)
        downstreams = payload.get("downstreams", [])
        for down in downstreams:
            down_name = down.get("name")
            down_type = "TABLE"
            
            if down_name:
                d_node = await self.graph.get_or_create_node(down_type, down_name)
                # Edge: Job -> Table
                await self.graph.add_dependency(node.id, d_node.id, type="LINEAGE")
                
        # Commit happens at controller level or here if atomic
        # await self.session.commit()

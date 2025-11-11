import logging
from typing import Any, Dict, List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Body, Depends, HTTPException

from graph_manager.api.v1.schemas import JobRegister
from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_build_service import GraphBuildService
from graph_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/graph", tags=["graph-sync"])


@router.post("/sync")
@inject
async def sync_graph(
    source: Optional[str] = Body(None, embed=True),
    reset: bool = Body(False, embed=True),
    jobs: Optional[List[JobRegister]] = Body(None, embed=True),
    svc: GraphBuildService = Depends(Provide[GraphContainer.graph_build_service]),
) -> Dict[str, Any]:
    """
    Synchronize graph data.

    - If `source == "job_manager"`: fetch from Job Manager and rebuild.
    - Else if `jobs` provided: upsert from payload list.
    - If `reset` is true: clears existing graph before sync.
    """
    try:
        if source == "job_manager":
            return await svc.sync_from_job_manager(reset=reset)
        if jobs is not None:
            return svc.sync_from_payload(jobs=jobs, reset=reset)
        raise HTTPException(status_code=400, detail="Provide 'source' or 'jobs' body")
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover
        logger.error(f"Graph sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Graph sync failed: {str(e)}")


@router.get("/sync/status")
@inject
def sync_status(
    svc: GraphBuildService = Depends(Provide[GraphContainer.graph_build_service]),
):
    status = svc.last_sync_status()
    if not status:
        return {"status": "idle", "message": "No sync has been performed yet"}
    return status


@router.post("/sync/node")
@inject
async def sync_node(
    node_type: str = Body(..., embed=True),
    node_db_id: int = Body(..., embed=True),
    svc: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """Sync a single node (job or table-related producers) from Job Manager."""
    return await svc.sync_node(node_type=node_type, node_db_id=node_db_id)

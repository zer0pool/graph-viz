import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_query_service import GraphQueryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


@router.get("/expand")
@inject
def expand(
    node_type: str = Query(..., enum=["job", "table"]),
    node_id: str | None = Query(None, description="job_id if node_type=job"),
    table_name: str | None = Query(None, description="full table name if node_type=table"),
    direction: str = Query("both", enum=["upstream", "downstream", "both"]),
    depth: int = Query(1, ge=1, le=5),
    limit: int | None = Query(None, ge=1, le=1000),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph_query_service]),
):
    if node_type == "job":
        if not node_id:
            return {"status": "error", "message": "node_id is required for job"}
        return svc.core.get_job_neighbors(job_id=node_id, level=depth, direction=direction, limit=limit)
    else:
        if not table_name:
            return {"status": "error", "message": "table_name is required for table"}
        return svc.core.get_table_neighbors(table_name=table_name, level=depth, direction=direction, limit=limit)


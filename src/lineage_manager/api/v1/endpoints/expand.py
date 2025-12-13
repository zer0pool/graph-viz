import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.graph_query_service import GraphQueryService

logger = logging.getLogger(__name__)

AUTH_DEPS = [Depends(require_authenticated_user)] if is_auth_enabled() else []

router = APIRouter(
    prefix="/api/v1/graph",
    tags=["graph"],
    dependencies=AUTH_DEPS,
)


@router.get("/expand")
@inject
def expand(
    node_type: str = Query(..., enum=["job", "table"]),
    node_id: str | None = Query(None, description="job_id if node_type=job"),
    table_name: str | None = Query(
        None, description="full table name if node_type=table"
    ),
    node_db_id: int | None = Query(None, description="internal DB id for convenience"),
    direction: str = Query("both", enum=["upstream", "downstream", "both"]),
    depth: int = Query(1, ge=1, le=5),
    limit: int | None = Query(None, ge=1, le=1000),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    if node_type == "job":
        if node_db_id is not None:
            return svc.get_job_neighbors_by_dbid(
                db_id=node_db_id, level=depth, direction=direction, limit=limit
            )
        if not node_id:
            return {
                "status": "error",
                "message": "node_id or node_db_id is required for job",
            }
        return svc.get_job_neighbors(
            job_id=node_id, level=depth, direction=direction, limit=limit
        )
    else:
        if node_db_id is not None:
            return svc.get_table_neighbors_by_dbid(
                db_id=node_db_id, level=depth, direction=direction, limit=limit
            )
        if not table_name:
            return {
                "status": "error",
                "message": "table_name or node_db_id is required for table",
            }
        return svc.get_table_neighbors(
            table_name=table_name, level=depth, direction=direction, limit=limit
        )

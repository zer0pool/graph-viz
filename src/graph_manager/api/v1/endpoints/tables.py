import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tables", tags=["Tables"])


@router.get("/{table_name}/impact")
@inject
def get_table_impact(
    table_name: str,
    max_depth: int = Query(3, ge=1, le=10),
    include_jobs: bool = Query(True),
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    Return downstream tables impacted by a base table, with writer jobs per depth.
    """
    logger.info(
        f"Received impact request for table={table_name}, max_depth={max_depth}, include_jobs={include_jobs}"
    )
    return graph_service.get_table_impact(
        base_table=table_name, max_depth=max_depth, include_jobs=include_jobs
    )


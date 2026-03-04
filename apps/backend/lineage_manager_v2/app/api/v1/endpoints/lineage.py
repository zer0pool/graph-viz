from typing import Any, Dict, List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.schemas.lineage import (
    GraphResponse,
    LineageRegistration,
    MermaidGraphResponse,
)
from app.core.container import Container
from app.services.graph_service import GraphService

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
@inject
async def register_lineage(
    data: LineageRegistration,
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    msg = await service.register_lineage(data)
    return {"message": msg}


# These were the original V1 paths used by mfe-lineage
@router.get("/lineage/graph", response_model=MermaidGraphResponse)
@inject
async def get_lineage_graph(
    node_id: str,
    depth: int = 1,
    direction: str = "both",
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    return await service.get_lineage_graph(node_id, depth, direction)


@router.post("/lineage/batch-details")
@inject
async def get_nodes_batch_details(
    payload: Dict[str, Any],
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    node_ids = payload.get("node_ids", [])
    return await service.get_nodes_batch_details(node_ids)


@router.get("/tables/{table_name:path}/hierarchy")
@inject
async def get_table_hierarchy(
    table_name: str,
    max_depth: int = 20,
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    """
    Return full upstream/downstream lineage hierarchy for List View.
    """
    res = await service.get_table_hierarchy(table_name, max_depth)
    if isinstance(res, dict) and res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res


# Maintain V2 specific for internal use
@router.get("/graph/table/{fqn:path}", response_model=GraphResponse)
@inject
async def get_table_lineage_v2(
    fqn: str,
    depth: int = 3,
    direction: str = "both",
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    graph = await service.get_table_lineage(fqn, depth, direction)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail="Table node not found in graph")
    return graph


@router.get("/graph/job/{job_id}", response_model=GraphResponse)
@inject
async def get_job_lineage_v2(
    job_id: str,
    depth: int = 3,
    direction: str = "both",
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    graph = await service.get_job_lineage(job_id, depth, direction)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail="Job node not found in graph")
    return graph

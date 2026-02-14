from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.api.v1.schemas.lineage import LineageRegistration, GraphResponse
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


@router.get("/graph/table/{fqn:path}", response_model=GraphResponse)
@inject
async def get_table_lineage(
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
async def get_job_lineage(
    job_id: str,
    depth: int = 3,
    direction: str = "both",
    service: GraphService = Depends(Provide[Container.graph_service]),
):
    graph = await service.get_job_lineage(job_id, depth, direction)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail="Job node not found in graph")
    return graph

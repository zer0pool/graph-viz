from typing import Any, Dict, List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.container import Container
from app.services.graph_service import GraphService

router = APIRouter()


@router.get("/{table_name:path}/hierarchy")
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

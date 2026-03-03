from typing import Any, Dict

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from app.core.container import Container
from app.services.metadata_service import MetadataService

router = APIRouter()


@router.get("", response_model=Dict[str, Any])
@router.get("/suggest", response_model=Dict[str, Any])
@inject
async def suggest(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=100),
    service: MetadataService = Depends(Provide[Container.metadata_service]),
):
    return await service.search_suggestions(q=q, limit=limit)

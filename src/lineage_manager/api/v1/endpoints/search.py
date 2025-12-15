from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.graph_query_service import GraphQueryService

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    dependencies=AUTH_DEPS,
)


@router.get("")
@router.get("/suggest")
@inject
def suggest(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=100),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    return svc.search_suggestions(q=q, limit=limit)

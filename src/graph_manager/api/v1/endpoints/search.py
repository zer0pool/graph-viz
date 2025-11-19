from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from graph_manager.core.auth import is_auth_enabled, require_authenticated_user
from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_query_service import GraphQueryService

AUTH_DEPS = [Depends(require_authenticated_user)] if is_auth_enabled() else []

router = APIRouter(
    prefix="/api/v1/search",
    tags=["Search"],
    dependencies=AUTH_DEPS,
)


@router.get("/suggest")
@inject
def suggest(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=100),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph_query_service]),
):
    return svc.search_suggestions(q=q, limit=limit)

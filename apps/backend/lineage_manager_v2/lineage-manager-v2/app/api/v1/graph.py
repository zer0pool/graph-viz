from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.session import get_db
from app.domain.graph.service import GraphService
from app.domain.graph.schemas import LineageResponse, GraphNodeRead

router = APIRouter()

async def get_graph_service(db: AsyncSession = Depends(get_db)) -> GraphService:
    return GraphService(db)

# --- Endpoints compatible with UI ---

@router.get("/lineage/graph", response_model=LineageResponse)
async def get_lineage_graph(
    root_id: int,
    depth: int = 1,
    direction: str = "all", # 'upstream', 'downstream', 'all'
    service: GraphService = Depends(get_graph_service)
):
    """
    Get graph for visualization.
    """
    return await service.get_lineage(root_id, depth) # Service currently hardcoded to depth 1, direction support needed in service?

@router.get("/lineage/node/{node_id}", response_model=GraphNodeRead)
async def get_node_details(
    node_id: int,
    service: GraphService = Depends(get_graph_service)
):
    node = await service.repo.get_node_by_id(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.get("/search/autocomplete", response_model=List[GraphNodeRead])
async def search_nodes(
    q: str,
    limit: int = 10,
    type: Optional[str] = None,
    service: GraphService = Depends(get_graph_service)
):
    # TODO: Implement search in Repository
    # For now return empty list or mock
    return []

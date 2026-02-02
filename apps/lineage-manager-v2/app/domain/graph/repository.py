from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Tuple

from app.domain.graph.models import GraphNode, GraphEdge
from app.domain.graph.schemas import GraphNodeCreate, GraphEdgeCreate
from app.core.exceptions import AppError

class GraphRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_node_by_name(self, node_type: str, name: str) -> Optional[GraphNode]:
        """Find a node by unique type+name composite."""
        stmt = select(GraphNode).where(
            and_(GraphNode.node_type == node_type, GraphNode.name == name)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_node_by_id(self, node_id: int) -> Optional[GraphNode]:
        stmt = select(GraphNode).where(GraphNode.id == node_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_node(self, node: GraphNodeCreate) -> GraphNode:
        """Create a new node. Idempotent if strict check done before."""
        db_node = GraphNode(
            node_type=node.node_type,
            name=node.name
        )
        self.session.add(db_node)
        try:
            await self.session.flush()
            await self.session.refresh(db_node)
            return db_node
        except IntegrityError:
            await self.session.rollback()
            # Fallback for race condition: return existing
            return await self.get_node_by_name(node.node_type, node.name)

    async def create_edge(self, edge: GraphEdgeCreate) -> GraphEdge:
        """Create a directed edge."""
        # Check existence first to avoid duplicate errors filling logs
        stmt = select(GraphEdge).where(
            and_(
                GraphEdge.source_id == edge.source_id,
                GraphEdge.target_id == edge.target_id,
                GraphEdge.edge_type == edge.edge_type
            )
        )
        existing = await self.session.execute(stmt)
        if existing.scalar_one_or_none():
            # Return existing or raise specific exception? 
            # Ideally return existing implementation of 'ensure_edge'
             return existing.scalar_one()

        db_edge = GraphEdge(
            source_id=edge.source_id,
            target_id=edge.target_id,
            edge_type=edge.edge_type
        )
        self.session.add(db_edge)
        await self.session.commit() # Commit edge immediately? Or let service manage transaction?
        # Repository should ideally not commit, but for atomic operations it's sometimes easier.
        # But per DDD/UoW, we should FLUSH here and let Service commit.
        # Reverting to flush.
        await self.session.flush() 
        await self.session.refresh(db_edge)
        return db_edge

    async def get_neighbors(self, node_id: int, direction: str = "downstream") -> List[Tuple[GraphEdge, GraphNode]]:
        """
        Get immediate neighbors.
        direction: 'upstream' (parents) or 'downstream' (children)
        Returns list of (Edge, PairNode)
        """
        if direction == "downstream":
            # source=node_id, finding targets
            stmt = (
                select(GraphEdge, GraphNode)
                .join(GraphNode, GraphNode.id == GraphEdge.target_id)
                .where(GraphEdge.source_id == node_id)
            )
        else:
            # target=node_id, finding sources
            stmt = (
                select(GraphEdge, GraphNode)
                .join(GraphNode, GraphNode.id == GraphEdge.source_id)
                .where(GraphEdge.target_id == node_id)
            )
        
        result = await self.session.execute(stmt)
        return result.all()
    
    async def get_nodes_by_ids(self, ids: List[int]) -> List[GraphNode]:
        stmt = select(GraphNode).where(GraphNode.id.in_(ids))
        result = await self.session.execute(stmt)
        return result.scalars().all()

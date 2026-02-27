from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.domain.graph.repository import GraphRepository
from app.domain.graph.schemas import (
    GraphNodeCreate,
    GraphEdgeCreate,
    LineageResponse,
    GraphNodeRead,
    GraphEdgeRead,
)


class GraphService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = GraphRepository(session)

    async def get_or_create_node(self, node_type: str, name: str) -> GraphNodeRead:
        """
        Get existing node or create new one.
        Ensures atomicity via DB constraints handled in repo.
        """
        # Try get first to avoid write lock overhead
        existing = await self.repo.get_node_by_name(node_type, name)
        if existing:
            return GraphNodeRead.model_validate(existing)

        # Create
        new_node = await self.repo.create_node(
            GraphNodeCreate(node_type=node_type, name=name)
        )
        return GraphNodeRead.model_validate(new_node)

    async def add_dependency(
        self, source_id: int, target_id: int, type: str = "LINEAGE"
    ) -> GraphEdgeRead:
        """Add an edge between two nodes."""
        edge = await self.repo.create_edge(
            GraphEdgeCreate(source_id=source_id, target_id=target_id, edge_type=type)
        )
        return GraphEdgeRead.model_validate(edge)

    async def get_lineage(self, root_node_id: int, depth: int = 1) -> LineageResponse:
        """
        Get lineage graph for a node.
        Currently implements depth=1 traversal.
        TODO: Implement depth > 1 using recursive CTE or Closure Table.
        """
        upstream = await self.repo.get_neighbors(root_node_id, direction="upstream")
        downstream = await self.repo.get_neighbors(root_node_id, direction="downstream")

        nodes = []
        edges = []

        # Add root node (need to fetch it)
        root = await self.repo.get_node_by_id(root_node_id)
        if root:
            nodes.append(GraphNodeRead.model_validate(root))

        # Process Upstream
        for edge, node in upstream:
            edges.append(GraphEdgeRead.model_validate(edge))
            nodes.append(GraphNodeRead.model_validate(node))

        # Process Downstream
        for edge, node in downstream:
            # Check duplicates if graph cycle exists or overlap
            if node.id not in [n.id for n in nodes]:
                nodes.append(GraphNodeRead.model_validate(node))
            if edge.id not in [e.id for e in edges]:
                edges.append(GraphEdgeRead.model_validate(edge))

        return LineageResponse(nodes=nodes, edges=edges)

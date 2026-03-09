from collections import deque
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.graph.entities.edge import Edge as EdgeEntity
from app.infrastructure.models import GraphClosure, GraphEdge, GraphNode


class GraphRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_node_id(self, node_type: str, name: str) -> Optional[int]:
        if node_type == "job":
            # For jobs, we look up in the job_node table by job_id
            from app.infrastructure.models import JobNode as JobModel

            query = (
                select(GraphNode.id)
                .join(JobModel, JobModel.node_id == GraphNode.id)
                .where(JobModel.job_id == name)
            )
        else:
            # For tables etc, name is the FQN
            query = select(GraphNode.id).where(
                GraphNode.node_type == node_type, GraphNode.name == name
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def ensure_node(self, node_type: str, name: str) -> int:
        node_id = await self.get_node_id(node_type, name)
        if node_id:
            return node_id

        node = GraphNode(node_type=node_type, name=name)
        self.db.add(node)
        await self.db.flush()
        await self.db.refresh(node)
        return node.id

    async def add_edge(
        self,
        source_id: int,
        target_id: int,
        edge_type: str,
        properties: Dict[str, Any] = None,
    ) -> EdgeEntity:
        query = select(GraphEdge).where(
            GraphEdge.source_node_id == source_id,
            GraphEdge.target_node_id == target_id,
            GraphEdge.edge_type == edge_type,
        )
        result = await self.db.execute(query)
        model = result.scalar_one_or_none()

        if model:
            if properties:
                model.properties = properties
        else:
            model = GraphEdge(
                source_node_id=source_id,
                target_node_id=target_id,
                edge_type=edge_type,
                properties=properties,
            )
            self.db.add(model)

        await self.db.flush()
        await self.db.refresh(model)
        return EdgeEntity(
            source_node_id=model.source_node_id,
            target_node_id=model.target_node_id,
            edge_type=model.edge_type,
            properties=model.properties,
            id=model.id,
        )

    async def get_lineage_graph(
        self, node_id: int, depth: int = 3, direction: str = "both"
    ) -> Dict[str, List]:
        """
        Retrieves the lineage graph using the Closure Table for high-performance recursive lookup.
        Returns: {"nodes": [...], "edges": [...]}
        """
        # 1. Find all reachable node IDs via Closure Table
        ancestors_query = select(GraphClosure.ancestor_id).where(
            GraphClosure.descendant_id == node_id, GraphClosure.depth <= depth
        )
        descendants_query = select(GraphClosure.descendant_id).where(
            GraphClosure.ancestor_id == node_id, GraphClosure.depth <= depth
        )

        nodes_to_fetch = {node_id}
        if direction in ("upstream", "both"):
            res = await self.db.execute(ancestors_query)
            nodes_to_fetch.update(res.scalars().all())
        if direction in ("downstream", "both"):
            res = await self.db.execute(descendants_query)
            nodes_to_fetch.update(res.scalars().all())

        # 2. Fetch all nodes metadata
        nodes_query = select(GraphNode).where(GraphNode.id.in_(nodes_to_fetch))
        nodes_res = await self.db.execute(nodes_query)
        nodes_data = [
            {
                "id": n.id,
                "type": n.node_type,
                "name": n.name,
                "properties": n.properties or {},
            }
            for n in nodes_res.scalars().all()
        ]

        # 3. Fetch all edges between these nodes
        edges_query = select(GraphEdge).where(
            and_(
                GraphEdge.source_node_id.in_(nodes_to_fetch),
                GraphEdge.target_node_id.in_(nodes_to_fetch),
            )
        )
        edges_res = await self.db.execute(edges_query)
        edges_data = [
            {
                "id": e.id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "type": e.edge_type,
                "properties": e.properties or {},
            }
            for e in edges_res.scalars().all()
        ]

        return {"nodes": nodes_data, "edges": edges_data}

    async def sync_closure_table(self):
        """
        Full rebuild of the closure table using a recursive approach (transitive closure).
        """
        # 1. Clear existing
        await self.db.execute(text("DELETE FROM graph_closure"))

        # 2. Level 0: Self-reference
        await self.db.execute(text("""
            INSERT INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT id, id, 0 FROM graph_node
        """))

        # 3. Level 1: Direct edges
        await self.db.execute(text("""
            INSERT INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT source_node_id, target_node_id, 1 FROM graph_edge
        """))

        # 4. Iteratively add deeper paths
        # Max depth safety (e.g. 10 levels)
        for d in range(1, 10):
            result = await self.db.execute(
                text(f"""
                INSERT INTO graph_closure (ancestor_id, descendant_id, depth)
                SELECT DISTINCT c.ancestor_id, e.target_node_id, :new_depth
                FROM graph_closure c
                JOIN graph_edge e ON c.descendant_id = e.source_node_id
                WHERE c.depth = :current_depth
                AND NOT EXISTS (
                    SELECT 1 FROM graph_closure 
                    WHERE ancestor_id = c.ancestor_id 
                    AND descendant_id = e.target_node_id
                )
            """),
                {"new_depth": d + 1, "current_depth": d},
            )
            if result.rowcount == 0:
                break

        await self.db.flush()

    async def clear_graph_data(self):
        """
        Clears all nodes, edges, and closure table entries.
        Cascading deletes should handle job_node and data_node if foreign keys are setup correctly.
        """
        await self.db.execute(text("DELETE FROM graph_closure"))
        await self.db.execute(text("DELETE FROM graph_edge"))
        await self.db.execute(text("DELETE FROM graph_node"))
        await self.db.flush()

    async def count_nodes_by_type(self, node_type: str) -> int:
        """Count nodes of a specific type in the GraphNode table."""
        from sqlalchemy import func

        result = await self.db.execute(
            select(func.count(GraphNode.id)).where(GraphNode.node_type == node_type)
        )
        return result.scalar() or 0

    async def get_stats(self) -> Dict[str, int]:
        from sqlalchemy import func

        node_count = await self.db.scalar(select(func.count()).select_from(GraphNode))
        edge_count = await self.db.scalar(select(func.count()).select_from(GraphEdge))
        closure_count = await self.db.scalar(
            select(func.count()).select_from(GraphClosure)
        )

        return {
            "nodes": node_count or 0,
            "edges": edge_count or 0,
            "closures": closure_count or 0,
        }

    async def get_producing_job_id(self, table_node_id: int) -> Optional[int]:
        """Find the ID of the job node that produces this table."""
        query = select(GraphEdge.source_node_id).where(
            GraphEdge.target_node_id == table_node_id, GraphEdge.edge_type == "produces"
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def get_table_hierarchy_bfs(
        self, start_id: int, start_name: str, direction: str, max_depth: int
    ) -> List[Dict]:
        """
        BFS over graph edges to build the lineage hierarchy.
        Moved from GraphService for better SoC.
        """
        items: List[Dict] = []
        visited = {start_id}
        queue = deque([(start_id, start_name, 0, None)])

        while queue:
            curr_id, curr_name, depth, parent_name = queue.popleft()
            if depth >= max_depth:
                continue

            if direction == "upstream":
                where = GraphEdge.target_node_id == curr_id
            else:
                where = GraphEdge.source_node_id == curr_id

            res = await self.db.execute(select(GraphEdge).where(where))
            for edge in res.scalars().all():
                neighbor_id = (
                    edge.source_node_id
                    if direction == "upstream"
                    else edge.target_node_id
                )
                if neighbor_id in visited:
                    continue
                visited.add(neighbor_id)

                n_res = await self.db.execute(
                    select(GraphNode).where(GraphNode.id == neighbor_id)
                )
                neighbor = n_res.scalar_one_or_none()
                if neighbor:
                    name = neighbor.name
                    items.append(
                        {
                            "id": name,
                            "name": name.split(".")[-1] if "." in name else name,
                            "type": neighbor.node_type,
                            "depth": depth + 1,
                            "parent": curr_name,
                        }
                    )
                    queue.append((neighbor_id, name, depth + 1, curr_name))
        return items

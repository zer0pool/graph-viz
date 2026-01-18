from sqlalchemy import insert, select, text

from lineage_manager.models import GraphClosure, GraphNode, GraphEdge
from lineage_manager.repositories.base_repository import BaseRepository


class ClosureRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_closure")

    def add_direct(self, ancestor_id: int, descendant_id: int):
        """Add direct relationship (depth=1)"""
        self.db.execute(
            insert(GraphClosure)
            .values(
                ancestor_id=ancestor_id,
                descendant_id=descendant_id,
                depth=1,
            )
            .prefix_with("IGNORE")
        )

    def expand_closure(self, ancestor_id: int, descendant_id: int):
        """Expand closure transitivity"""
        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT c.ancestor_id, :v, c.depth + 1
            FROM graph_closure c WHERE c.descendant_id = :u
        """
            ),
            {"u": ancestor_id, "v": descendant_id},
        )

        self.db.execute(
            text(
                """
            INSERT IGNORE INTO graph_closure (ancestor_id, descendant_id, depth)
            SELECT :u, c.descendant_id, c.depth + 1
            FROM graph_closure c WHERE c.ancestor_id = :v
        """
            ),
            {"u": ancestor_id, "v": descendant_id},
        )

    def get_upstream_nodes(
        self, node_id: int, node_type: str = None, max_depth: int = None
    ):
        """Get all upstream nodes from closure table."""
        query = (
            select(
                GraphNode.id,
                GraphNode.name,
                GraphNode.node_type,
                GraphClosure.depth,
            )
            .select_from(GraphClosure)
            .join(GraphNode, GraphNode.id == GraphClosure.ancestor_id)
            .where(GraphClosure.descendant_id == node_id)
        )

        if node_type:
            query = query.where(GraphNode.node_type == node_type)

        if max_depth:
            query = query.where(GraphClosure.depth <= max_depth)

        query = query.order_by(GraphClosure.depth.asc())

        result = self.db.execute(query).fetchall()
        return [
            {
                "id": row.id,
                "full_name": row.name,
                "type": row.node_type,
                "depth": row.depth,
            }
            for row in result
        ]

    def get_downstream_nodes(
        self, node_id: int, node_type: str = None, max_depth: int = None
    ):
        """Get all downstream nodes from closure table."""
        query = (
            select(
                GraphNode.id,
                GraphNode.name,
                GraphNode.node_type,
                GraphClosure.depth,
            )
            .select_from(GraphClosure)
            .join(GraphNode, GraphNode.id == GraphClosure.descendant_id)
            .where(GraphClosure.ancestor_id == node_id)
        )

        if node_type:
            query = query.where(GraphNode.node_type == node_type)

        if max_depth:
            query = query.where(GraphClosure.depth <= max_depth)

        query = query.order_by(GraphClosure.depth.asc())

        result = self.db.execute(query).fetchall()
        return [
            {
                "id": row.id,
                "full_name": row.name,
                "type": row.node_type,
                "depth": row.depth,
            }
            for row in result
        ]

    def rebuild_closure(self):
        """
        Rebuild the entire graph_closure table using Python-based BFS.
        This avoids database recursion limits and is faster for graphs that fit in memory (<100k nodes).
        """
        import collections

        # 1. Fetch all edges using ORM models
        edges = self.db.execute(
            select(GraphEdge.source_node_id, GraphEdge.target_node_id)
        ).fetchall()
        
        # 2. Build Adjacency List
        adj = collections.defaultdict(list)
        nodes = set()
        for src, dst in edges:
            adj[src].append(dst)
            nodes.add(src)
            nodes.add(dst)
            
        closure_records = []
        
        # 3. BFS for each node to find all descendants
        # Complexity: O(V * (V+E)) - acceptable for V < 5000
        for start_node in nodes:
            queue = collections.deque([(start_node, 0)])
            visited = {start_node}
            
            while queue:
                curr, depth = queue.popleft()
                
                # Add to closure (skip self-loop at depth 0 if desired, but typically closure includes self or starts at depth 1)
                if depth > 0:
                    closure_records.append({
                        "ancestor_id": start_node,
                        "descendant_id": curr,
                        "depth": depth
                    })
                
                # Limit depth to prevent unreasonable growth for extremely deep chains
                if depth >= 100: 
                    continue
                    
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, depth + 1))

        # 4. Truncate and Bulk Insert
        self.db.execute(text(f"TRUNCATE TABLE {GraphClosure.__tablename__}"))
        
        if closure_records:
            # Insert in chunks to avoid packet size limits
            chunk_size = 5000
            for i in range(0, len(closure_records), chunk_size):
                chunk = closure_records[i:i + chunk_size]
                self.db.execute(
                    insert(GraphClosure),
                    chunk
                )


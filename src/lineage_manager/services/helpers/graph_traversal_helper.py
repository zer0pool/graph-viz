"""
Graph Traversal Helper.

Provides reusable BFS traversal algorithms for graph exploration.
Consolidates BFS logic that was previously duplicated across multiple methods.
"""

from __future__ import annotations

import logging
from collections import deque
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from lineage_manager.core.uow import GraphUnitOfWork, GraphReadOnlyUnitOfWork

logger = logging.getLogger(__name__)


class GraphTraversalHelper:
    """
    Reusable graph traversal algorithms.
    
    Extracts common BFS logic from GraphService methods:
    - get_job_neighbors (~126 lines -> ~30 lines)
    - get_table_neighbors (~123 lines -> ~30 lines)
    - get_table_lineage_hierarchy (~132 lines -> ~70 lines)
    """
    
    def __init__(self, uow: GraphUnitOfWork | GraphReadOnlyUnitOfWork):
        self.uow = uow
    
    def bfs_neighbors(
        self,
        start_type: str,
        start_id: int,
        start_node: Any,
        level: int = 1,
        direction: str = "both",
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generic BFS traversal to find neighbors up to N hops.
        
        Args:
            start_type: "job" or "table"
            start_id: Database ID of starting node
            start_node: The starting node object (for node entry creation)
            level: Maximum traversal depth
            direction: "upstream", "downstream", or "both"
            limit: Optional maximum number of edges to return
        
        Returns:
            {
                "nodes": list of node dicts,
                "edges": list of edge dicts,
            }
        """
        nodes: Dict[str, dict] = {}
        edges: List[dict] = []
        
        visited: Set[Tuple[str, int]] = {(start_type, start_id)}
        frontier: List[Tuple[str, int]] = [(start_type, start_id)]
        
        # Include starting node
        self._ensure_node_entry(nodes, start_type, start_node)
        
        added = 0
        for _ in range(max(1, level)):
            next_frontier = []
            
            for ntype, nid in frontier:
                neighbors = self._get_neighbors_for_node(ntype, nid, direction)
                
                for neighbor_type, neighbor_obj, edge_info in neighbors:
                    nkey = self._ensure_node_entry(nodes, neighbor_type, neighbor_obj)
                    
                    # Create edge
                    if ntype == "job":
                        jkey = f"j{nid}"
                        source = jkey if edge_info["io"] == "output" else nkey
                        target = nkey if edge_info["io"] == "output" else jkey
                    else:  # table
                        tkey = f"t{nid}"
                        source = edge_info.get("source_key", tkey)
                        target = edge_info.get("target_key", nkey)
                    
                    e = {"source": source, "target": target, "io": edge_info["io"]}
                    if e not in edges:
                        edges.append(e)
                        added += 1
                    
                    if limit and added >= limit:
                        return {"nodes": list(nodes.values()), "edges": edges}
                    
                    if (neighbor_type, neighbor_obj.id) not in visited:
                        visited.add((neighbor_type, neighbor_obj.id))
                        next_frontier.append((neighbor_type, neighbor_obj.id))
            
            frontier = next_frontier
            if not frontier:
                break
        
        return {"nodes": list(nodes.values()), "edges": edges}
    
    def _get_neighbors_for_node(
        self,
        node_type: str,
        node_id: int,
        direction: str,
    ) -> List[Tuple[str, Any, Dict]]:
        """
        Get neighbor nodes for a given node.
        
        Returns:
            List of (neighbor_type, neighbor_obj, edge_info) tuples
        """
        neighbors = []
        uow = self.uow
        
        if node_type == "job":
            # Job -> Tables (output) for downstream
            if direction in ("downstream", "both"):
                for tbl in uow.job_table_links.get_tables_by_job_and_io_type(node_id, "output"):
                    neighbors.append(("table", tbl, {"io": "output"}))
            
            # Job <- Tables (inputs) for upstream
            if direction in ("upstream", "both"):
                for tbl in uow.job_table_links.get_tables_by_job_and_io_type(node_id, "input"):
                    neighbors.append(("table", tbl, {"io": "input"}))
        
        else:  # table
            # Table <- Jobs (producers) for upstream
            if direction in ("upstream", "both"):
                for job_obj in uow.job_table_links.get_jobs_by_table_and_io_type(node_id, "output"):
                    neighbors.append(("job", job_obj, {"io": "output"}))
            
            # Table -> Jobs (consumers) for downstream
            if direction in ("downstream", "both"):
                for job_obj in uow.job_table_links.get_jobs_by_table_and_io_type(node_id, "input"):
                    neighbors.append(("job", job_obj, {"io": "input"}))
        
        return neighbors
    
    def _ensure_node_entry(self, nodes: dict, node_type: str, obj: Any) -> str:
        """
        Ensure node dict entry exists.
        
        Returns:
            Canonical node key string (e.g., "j123" or "t456")
        """
        if node_type == "job":
            key = f"j{obj.id}"
            if key not in nodes:
                # Extract job metadata
                jm = getattr(obj, "job_metadata", {}) or {}
                nodes[key] = {
                    "id": key,
                    "type": "job",
                    "job_id": obj.job_id,
                    "name": obj.name,
                    "owner": jm.get("owner") or obj.owner,
                    "enabled": jm.get("enabled", True),
                    "status": jm.get("status"),
                }
        else:  # table
            key = f"t{obj.id}"
            if key not in nodes:
                nodes[key] = {
                    "id": key,
                    "type": "table",
                    "full_name": obj.full_name,
                    "name": obj.full_name,
                }
        return key
    
    def bfs_lineage_hierarchy(
        self,
        start_type: str,
        start_id: int,
        start_full_name: str,
        direction: str,
        max_depth: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        BFS traversal for lineage hierarchy (List View).
        
        Args:
            start_type: "job" or "table"
            start_id: Database ID of starting node
            start_full_name: Full name of starting node
            direction: "upstream" or "downstream"
            max_depth: Maximum traversal depth
        
        Returns:
            List of lineage items: [{id, name, type, depth, parent}, ...]
        """
        uow = self.uow
        result = []
        visited = set()
        
        # Queue items: (node_type, db_id, full_name, depth, parent_id)
        queue = deque([(start_type, start_id, start_full_name, 0, None)])
        visited.add((start_type, start_id))
        
        while queue:
            node_type, db_id, full_name, depth, parent_id = queue.popleft()
            
            if depth > max_depth:
                continue
            
            # Add to result (skip root node at depth 0)
            if depth > 0:
                result.append({
                    "id": full_name,
                    "name": full_name.split(".")[-1] if "." in full_name else full_name,
                    "type": node_type,
                    "depth": depth,
                    "parent": parent_id,
                })
            
            # Get next level nodes
            if node_type == "table":
                if direction == "upstream":
                    # Upstream: find jobs that produce this table
                    producers = uow.job_table_links.get_jobs_by_table_and_io_type(db_id, "output")
                    for job in producers:
                        if ("job", job.id) not in visited:
                            visited.add(("job", job.id))
                            queue.append(("job", job.id, job.job_id, depth + 1, full_name))
                else:
                    # Downstream: find jobs that consume this table
                    consumers = uow.job_table_links.get_jobs_by_table_and_io_type(db_id, "input")
                    for job in consumers:
                        if ("job", job.id) not in visited:
                            visited.add(("job", job.id))
                            queue.append(("job", job.id, job.job_id, depth + 1, full_name))
            
            elif node_type == "job":
                if direction == "upstream":
                    # Upstream: find tables that this job reads
                    inputs = uow.job_table_links.get_tables_by_job_and_io_type(db_id, "input")
                    for tbl in inputs:
                        if ("table", tbl.id) not in visited:
                            visited.add(("table", tbl.id))
                            queue.append(("table", tbl.id, tbl.full_name, depth + 1, full_name))
                else:
                    # Downstream: find tables that this job writes
                    outputs = uow.job_table_links.get_tables_by_job_and_io_type(db_id, "output")
                    for tbl in outputs:
                        if ("table", tbl.id) not in visited:
                            visited.add(("table", tbl.id))
                            queue.append(("table", tbl.id, tbl.full_name, depth + 1, full_name))
        
        return result
    
    def find_root_and_leaf_nodes(
        self,
        upstream_items: List[Dict],
        downstream_items: List[Dict],
    ) -> Tuple[List[str], List[str]]:
        """
        Find root nodes (no parents) and leaf nodes (no children).
        
        Returns:
            (root_node_ids, leaf_node_ids)
        """
        # Root nodes: nodes at max depth in upstream direction
        root_nodes = []
        if upstream_items:
            max_depth = max(item["depth"] for item in upstream_items)
            root_nodes = [item["id"] for item in upstream_items if item["depth"] == max_depth]
        
        # Leaf nodes: nodes at max depth in downstream direction
        leaf_nodes = []
        if downstream_items:
            max_depth = max(item["depth"] for item in downstream_items)
            leaf_nodes = [item["id"] for item in downstream_items if item["depth"] == max_depth]
        
        return root_nodes, leaf_nodes

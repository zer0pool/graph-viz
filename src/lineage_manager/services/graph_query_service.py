import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select, text

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

from lineage_manager.core.config import get_settings
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models import GraphEdge, GraphNode

from lineage_manager.services.helpers.graph_traversal_helper import GraphTraversalHelper

logger = logging.getLogger(__name__)


class GraphQueryService:
    def __init__(self, uow: GraphUnitOfWork):
        self.uow = uow
        self._traversal = GraphTraversalHelper(uow)

        settings = get_settings()
        self.redis_enabled = settings.redis.enabled and redis is not None
        self.redis_ttl = settings.redis.default_ttl
        self._r = None
        if self.redis_enabled:
            try:
                self._r = redis.Redis(
                    host=settings.redis.host,
                    port=settings.redis.port,
                    db=settings.redis.db,
                    decode_responses=True,
                )
                # ping to validate
                self._r.ping()
                logger.info("Redis cache enabled for GraphQueryService")
            except Exception as e:  # pragma: no cover
                logger.warning(f"Redis not available, disabling cache: {e}")
                self.redis_enabled = False
                self._r = None

    def _cache_get(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.redis_enabled or not self._r:
            return None
        val = self._r.get(key)
        if not val:
            return None
        try:
            return json.loads(val)
        except Exception:
            return None

    def _cache_set(self, key: str, value: Dict[str, Any]) -> None:
        if not self.redis_enabled or not self._r:
            return
        try:
            self._r.setex(key, self.redis_ttl, json.dumps(value))
        except Exception:
            pass

    # Read APIs with caching wrappers
    def get_health_stats(self):
        key = "health_stats"
        cached = self._cache_get(key)
        if cached:
            return cached

        uow = self.uow
        logger.info("Starting health check statistics collection")
        try:
            stats = {}
            # Count jobs
            # Note: naive count via list_all
            jobs = uow.jobs.list_all()
            stats["job_count"] = len(jobs)
            
            # Count tables
            stats["table_count"] = uow.tables.count_tables()
            
            # Count edges
            stats["edge_count"] = uow.edges.count_all()
            
            # Count closures
            stats["closure_count"] = uow.closures.count_all()
            
            # Database status
            try:
                uow.db.execute(text("SELECT 1"))
                stats["database_status"] = "connected"
            except Exception as db_error:
                stats["database_status"] = "disconnected"
                logger.error(f"Database connection test failed: {db_error}")

            stats["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            res = {"status": "healthy", "database": stats}
            self._cache_set(key, res)
            return res
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def get_table_dag(
        self,
        full_name: str,
        direction: str,
        depth: int,
        include_jobs: bool,
        include_tables: bool,
    ):
        key = f"dag:{full_name}:{direction}:{depth}:{int(include_jobs)}:{int(include_tables)}"
        cached = self._cache_get(key)
        if cached:
            return cached
            
        res = self.uow.tables.get_table_dag(
             table_name=full_name,
             max_depth=depth,
             direction=direction,
             include_jobs=include_jobs,
             include_tables=include_tables,
        )
        if not res:
             final_res = {
                "status": "error",
                "message": f"Table '{full_name}' not found",
                "table_name": full_name,
             }
        else:
            final_res = {
                "status": "success",
                "table_name": full_name,
                "graph": res,
            }
        
        self._cache_set(key, final_res)
        return final_res

    def get_table_impact(self, base_table: str, max_depth: int, include_jobs: bool):
        key = f"impact:{base_table}:{max_depth}:{int(include_jobs)}"
        cached = self._cache_get(key)
        if cached:
            return cached

        # Implementation
        uow = self.uow
        # Resolve base table
        table = uow.tables.get_by_full_name(base_table)
        if not table:
             res = {
                "status": "error",
                "message": f"Table '{base_table}' not found",
                "base_table": base_table,
                "downstream": [],
                "summary": {
                    "total_depth": 0,
                    "total_downstream_tables": 0,
                    "total_writer_jobs": 0,
                },
            }
             self._cache_set(key, res)
             return res

        visited_tables = {table.id}
        queue = deque([(table.id, table.full_name, 0)])
        items = []
        max_seen_depth = 0

        while queue:
            current_id, current_name, depth = queue.popleft()
            if depth >= max_depth:
                continue

            # Find jobs that consume current table as input
            consumer_jobs = uow.job_table_links.get_jobs_by_table_and_io_type(
                current_id, "input"
            )

            # For each consuming job, collect its output tables
            for job in consumer_jobs:
                out_tables = uow.job_table_links.get_tables_by_job_and_io_type(
                    job.id, "output"
                )
                for ot in out_tables:
                    if ot.id in visited_tables:
                        continue
                    visited_tables.add(ot.id)
                    next_depth = depth + 1
                    max_seen_depth = max(max_seen_depth, next_depth)

                    writer_jobs_list = []
                    if include_jobs:
                        writers = uow.job_table_links.get_jobs_by_table_and_io_type(
                            ot.id, "output"
                        )
                        writer_jobs_list = [w.job_id for w in writers]

                    items.append(
                        {
                            "depth": next_depth,
                            "table": ot.full_name,
                            "writer_jobs": writer_jobs_list,
                            "description": f"{base_table} → {ot.full_name} impact depth={next_depth}",
                        }
                    )
                    # Enqueue for further traversal
                    queue.append((ot.id, ot.full_name, next_depth))

        total_writer_jobs = sum(len(it.get("writer_jobs", [])) for it in items)
        res = {
            "base_table": base_table,
            "downstream": items,
            "summary": {
                "total_depth": max_seen_depth,
                "total_downstream_tables": len(items),
                "total_writer_jobs": total_writer_jobs,
            },
        }

        self._cache_set(key, res)
        return res

    def get_job_neighbors(
        self, job_id: str, level: int = 1, direction: str = "both", limit: int | None = None
    ):
        lim = "none" if limit is None else str(limit)
        key = f"neighbors:job:{job_id}:{level}:{direction}:{lim}"
        cached = self._cache_get(key)
        if cached:
            return cached

        # Implementation via traversal helper
        job = self.uow.jobs.get(job_id)
        if not job:
            return {"status": "error", "message": f"Job '{job_id}' not found"}

        result = self._traversal.bfs_neighbors(
            "job", job.id, job, level, direction, limit
        )

        res = {
            "base_job": job_id,
            "nodes": result["nodes"],
            "edges": result["edges"],
        }
        
        self._cache_set(key, res)
        return res

    def get_table_neighbors(
        self,
        table_name: str,
        level: int = 1,
        direction: str = "both",
        limit: int | None = None,
    ):
        lim = "none" if limit is None else str(limit)
        key = f"neighbors:table:{table_name}:{level}:{direction}:{lim}"
        cached = self._cache_get(key)
        if cached:
            return cached

        # Implementation via traversal helper
        table = self.uow.tables.get_by_full_name(table_name)
        if not table:
            return {"status": "error", "message": f"Table '{table_name}' not found"}

        result = self._traversal.bfs_neighbors(
            "table", table.id, table, level, direction, limit
        )

        res = {
            "base_table": table_name,
            "nodes": result["nodes"],
            "edges": result["edges"],
        }
        
        self._cache_set(key, res)
        return res

    # Helpers resolving by internal DB id (for frontend convenience)
    def get_job_neighbors_by_dbid(
        self, db_id: int, level: int, direction: str = "both", limit: int | None = None
    ):
        job = self.uow.jobs.get_by_id(db_id)
        if not job:
            return {"status": "error", "message": f"Job with id={db_id} not found"}
        return self.get_job_neighbors(
            job_id=job.job_id, level=level, direction=direction, limit=limit
        )

    def get_table_neighbors_by_dbid(
        self, db_id: int, level: int, direction: str = "both", limit: int | None = None
    ):
        table = self.uow.tables.get_by_id(db_id)
        if not table:
            return {"status": "error", "message": f"Table with id={db_id} not found"}
        return self.get_table_neighbors(
            table_name=table.full_name, level=level, direction=direction, limit=limit
        )

    # Simple search (03)
    def search_suggestions(self, q: str, limit: int = 10):
        term = (q or "").strip()
        if not term:
            return {"query": q, "tables": [], "jobs": [], "owners": []}

        jobs = self.uow.jobs.search_by_prefix(prefix=term, limit=limit)
        tables = self.uow.tables.search_by_prefix(prefix=term, limit=limit)
        owners = self.uow.jobs.search_owners_by_prefix(prefix=term, limit=limit)

        return {
            "query": term,
            "jobs": [
                {
                    "job_id": job.job_id or job.name,
                    "name": job.display_name,
                    "owner": job.owner,
                }
                for job in jobs
            ],
            "tables": [
                {
                    "full_name": table.full_name,
                    "table_name": table.table_name or table.full_name,
                    "project": table.project_name,
                    "dataset": table.dataset_name,
                }
                for table in tables
            ],
            "owners": owners,
        }

    def get_table_dependencies(self, table_name: str):
        key = f"dependencies:{table_name}"
        cached = self._cache_get(key)
        if cached:
            return cached
            
        uow = self.uow
        table = uow.tables.get_by_full_name(table_name)
        if not table:
            return {"status": "error", "message": f"Table '{table_name}' not found"}

        rows = uow.job_table_links.get_job_inputs_with_trigger_flag(table.id)

        items = []
        for job, is_on in rows:
            job_id = getattr(job, "job_id", None) or job.name
            job_name = getattr(job, "display_name", None) or job.name or job_id
            items.append(
                {
                    "job_id": job_id,
                    "name": job_name,
                    "trigger": bool(is_on), # Keep field name in response for API compatibility if needed, but I'll change it if user wants "Backend everything"
                }
            )

        res = {
            "status": "success",
            "jobs": items,
        }
        
        self._cache_set(key, res)
        return res

    def get_table_lineage_hierarchy(self, table_name: str, max_depth: int = 20):
        # Implementation via traversal helper
        uow = self.uow
        center = uow.tables.get_by_full_name(table_name)
        if not center:
            return {
                "status": "error",
                "message": f"Table '{table_name}' not found",
                "upstream": [], "downstream": []
            }
        
        # Use traversal helper
        upstream = self._traversal.bfs_lineage_hierarchy(
            "table", center.id, center.full_name, "upstream", max_depth
        )
        downstream = self._traversal.bfs_lineage_hierarchy(
            "table", center.id, center.full_name, "downstream", max_depth
        )
        
        # Identify roots and leaves from the traversal results
        roots, leaves = self._traversal.find_root_and_leaf_nodes(upstream, downstream)
        
        # Helper skips depth 0 (center node), so we add it manually
        center_node = {
            "id": center.full_name,
            "name": center.full_name,
            "type": "TABLE",
            "depth": 0,
            "parent": None,
            "properties": getattr(center, "properties", {}) or {}
        }
        
        # Prepend center node to both lists
        upstream.insert(0, center_node)
        downstream.insert(0, center_node)
        
        return {
            "status": "success",
            "upstream": upstream,
            "downstream": downstream,
            "root_nodes": roots,
            "leaf_nodes": leaves
        }

    def get_table_lineage_summary(
        self,
        table_name: str,
        max_roots: int = 50,
        max_leaves: int = 50,
        max_preview_paths: int = 4,
        max_full_paths: int = 25,
    ):
        key = f"lineage_summary:{table_name}:{max_roots}:{max_leaves}"
        cached = self._cache_get(key)
        if cached:
            cached["cache"] = {
                "cached": True,
                "expires_in_sec": self.redis_ttl if self.redis_enabled else None,
            }
            return cached

        uow = self.uow
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {
                    "status": "error",
                    "error_code": "TABLE_NOT_FOUND",
                    "message": f"Table '{table_name}' not found",
                }

            link_repo = uow.job_table_links

            upstream_tables, upstream_jobs = set(), set()
            downstream_tables, downstream_jobs = set(), set()
            upstream_roots, downstream_leaves = [], []
            upstream_paths, downstream_paths = [], []
            upstream_depth = 0
            downstream_depth = 0

            # Upstream traversal
            queue = deque([(table, 0, [table.full_name])])
            visited_jobs = set()
            while queue:
                current, depth, path = queue.popleft()
                producers = link_repo.get_jobs_by_table_and_io_type(current.id, "output")
                if not producers and current.id != table.id:
                    if current.full_name not in upstream_roots:
                        upstream_roots.append(current.full_name)
                    upstream_paths.append(list(path))
                    continue

                for job in producers:
                    job_key = job.job_id or getattr(job, "display_name", None) or job.name or f"job:{job.id}"
                    if job_key:
                        upstream_jobs.add(job_key)
                    if job.id not in visited_jobs:
                        visited_jobs.add(job.id)
                    inputs = link_repo.get_tables_by_job_and_io_type(job.id, "input")
                    for tbl in inputs:
                        if tbl.full_name in path:
                            continue
                        upstream_tables.add(tbl.full_name)
                        next_path = [tbl.full_name] + path
                        queue.append((tbl, depth + 1, next_path))
                        upstream_depth = max(upstream_depth, depth + 1)

            # Downstream traversal
            queue = deque([(table, 0, [table.full_name])])
            visited_jobs = set()
            while queue:
                current, depth, path = queue.popleft()
                consumers = link_repo.get_jobs_by_table_and_io_type(current.id, "input")
                if not consumers and current.id != table.id:
                    if current.full_name not in downstream_leaves:
                        downstream_leaves.append(current.full_name)
                    downstream_paths.append(list(path))
                    continue

                for job in consumers:
                    job_key = job.job_id or getattr(job, "display_name", None) or job.name or f"job:{job.id}"
                    if job_key:
                        downstream_jobs.add(job_key)
                    if job.id not in visited_jobs:
                        visited_jobs.add(job.id)
                    outputs = link_repo.get_tables_by_job_and_io_type(job.id, "output")
                    for tbl in outputs:
                        if tbl.full_name in path:
                            continue
                        downstream_tables.add(tbl.full_name)
                        next_path = path + [tbl.full_name]
                        queue.append((tbl, depth + 1, next_path))
                        downstream_depth = max(downstream_depth, depth + 1)

            def uniq_list(values):
                seen = set()
                ordered = []
                for val in values:
                    if val not in seen:
                        seen.add(val)
                        ordered.append(val)
                return ordered

            preview_paths = (upstream_paths + downstream_paths)[:max_preview_paths]
            full_paths = (upstream_paths + downstream_paths)[:max_full_paths]

            res = {
                "status": "success",
                "table": table.full_name,
                "metrics": {
                    "root_count": len(upstream_roots),
                    "leaf_count": len(downstream_leaves),
                    "upstream_table_count": len(upstream_tables),
                    "downstream_table_count": len(downstream_tables),
                    "upstream_job_count": len(upstream_jobs),
                    "downstream_job_count": len(downstream_jobs),
                    "depth": {
                        "upstream": upstream_depth,
                        "downstream": downstream_depth,
                    },
                },
                "upstream": {
                    "root_tables": uniq_list(upstream_roots)[:max_roots],
                    "tables": sorted(upstream_tables),
                    "jobs": sorted(upstream_jobs),
                },
                "downstream": {
                    "leaf_tables": uniq_list(downstream_leaves)[:max_leaves],
                    "tables": sorted(downstream_tables),
                    "jobs": sorted(downstream_jobs),
                },
                "paths": {
                    "preview": [list(path) for path in preview_paths],
                    "full": [list(path) for path in full_paths],
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            logger.error(f"Failed to compute lineage summary for {table_name}: {exc}")
            return {
                "status": "error",
                "message": str(exc),
            }

        if res.get("status") == "success":
            res["cache"] = {
                "cached": False,
                "expires_in_sec": self.redis_ttl if self.redis_enabled else None,
            }
            self._cache_set(key, res)
        return res

    def get_job(self, job_id: str):
        """Return a job row enriched with derived fields from properties."""
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        
        # derive defaults
        # 1. Try top-level properties first
        status = job._get_prop("status")
        enabled = job._get_prop("enabled")
            
        # attach for response usage
        setattr(job, "status", status)
        setattr(job, "enabled", enabled)
        return job

    def get_nodes_batch_details(self, node_ids: list[str]):
        """Fetch details for multiple nodes (tables/jobs) in one query, returning nested Table/Job info."""
        if not node_ids:
            return {"status": "success", "results": {}}

        uow = self.uow
        # 1. Fetch all requested nodes
        stmt = select(GraphNode).where(GraphNode.name.in_(node_ids))
        nodes = uow.db.execute(stmt).scalars().all()
        
        # Mapping to keep track of nodes
        node_map = {n.name: n for n in nodes}
        
        # 2. Identify table nodes and find their producers
        table_nodes = [n for n in nodes if n.node_type == "table"]
        table_node_ids = [n.id for n in table_nodes]
        producer_map = {} # table_node_id -> JobNode
        
        if table_node_ids:
            # Query edges where target is one of our tables and edge_type is 'write'
            # Then join with GraphNode to get the job information
            producer_stmt = (
                select(GraphEdge.target_node_id, GraphNode)
                .join(GraphNode, GraphEdge.source_node_id == GraphNode.id)
                .where(
                    GraphEdge.target_node_id.in_(table_node_ids),
                    GraphEdge.edge_type == "write"
                )
            )
            producer_results = uow.db.execute(producer_stmt).all()
            for t_id, job_node in producer_results:
                if t_id not in producer_map:
                    producer_map[t_id] = job_node

        results = {}
        for nid in node_ids:
            node = node_map.get(nid)
            if not node:
                results[nid] = self._make_empty_node_details(nid)
                continue

            meta = node.job_metadata or {}
            
            # Table Info Section
            table_info = {
                "id": node.name,
                "type": node.node_type,
                "write_mode": node.write_mode or meta.get("write_mode") or "-",
                "storage_type": node.storage_type or meta.get("storage_type") or "-",
            }

            # Job Info Section
            job_node = None
            if node.node_type == "job":
                job_node = node
            else:
                job_node = producer_map.get(node.id)

            if job_node:
                j_meta = job_node.job_metadata or {}
                j_sched = j_meta.get("schedule") or {}
                job_info = {
                    "job_id": job_node.name,
                    "owner": job_node.owner or j_meta.get("owner") or "-",
                    "status": j_meta.get("status") or "-",
                    "run_status": j_meta.get("run_status") or "-",
                    "cron": j_sched.get("cron") or j_sched.get("interval") or "-",
                    "start_date": j_sched.get("start_date") or j_meta.get("start_date") or "-",
                    "end_date": j_sched.get("end_date") or j_meta.get("end_date") or "-",
                    "lifecycle_status": j_meta.get("lifecycle_status") or "-",
                }
            else:
                job_info = {
                    "job_id": "-",
                    "owner": "-",
                    "status": "-",
                    "run_status": "-",
                    "cron": "-",
                    "start_date": "-",
                    "end_date": "-",
                    "lifecycle_status": "-",
                }

            results[nid] = {
                "table_info": table_info,
                "job_info": job_info
            }

        return {"status": "success", "results": results}

    def _make_empty_node_details(self, nid: str):
        return {
            "table_info": {
                "id": nid,
                "type": "unknown",
                "write_mode": "-",
                "storage_type": "-",
            },
            "job_info": {
                "job_id": "-",
                "owner": "-",
                "status": "not_found",
                "run_status": "-",
                "cron": "-",
                "start_date": "-",
                "end_date": "-",
                "lifecycle_status": "-",
            }
        }

    # ============================================================================
    # New Lineage Graph API for Mermaid Viewer (Cytoscape Migration)
    # ============================================================================
    
    MAX_NODES = 30
    MAX_EDGES = 50
    MAX_DEPTH = 2
    
    def get_lineage_graph(
        self,
        node_id: str,
        depth: int = 1,
        direction: Optional[str] = None
    ):
        """
        Get lineage graph optimized for Mermaid rendering.
        
        Args:
            node_id: Node identifier in format "job:xxx" or "table:xxx"
            depth: Traversal depth (1-2, enforced)
            direction: None (both), "upstream", or "downstream"
            
        Returns:
            MermaidGraphResponse with nodes, edges, and metadata
        """
        from lineage_manager.api.v1.schemas import (
            GraphNode as GraphNodeSchema,
            GraphEdge as GraphEdgeSchema,
            GraphMetadata,
            MermaidGraphResponse
        )
        
        # Validate depth
        if depth > self.MAX_DEPTH:
            raise ValueError(f"Depth must be <= {self.MAX_DEPTH}")
        
        # Parse node_id
        if ":" not in node_id:
            # Assume it's a job_id for backward compatibility
            node_id = f"job:{node_id}"
        
        node_type, node_name = node_id.split(":", 1)
        
        # Get base node
        if node_type == "job":
            base_node = self.uow.jobs.get(node_name)
            if not base_node:
                raise ValueError(f"Job '{node_name}' not found")
        elif node_type == "table":
            base_node = self.uow.tables.get_by_full_name(node_name)
            if not base_node:
                raise ValueError(f"Table '{node_name}' not found")
        else:
            raise ValueError(f"Invalid node type: {node_type}")
        
        # Use traversal helper to get neighbors
        result = self._traversal.bfs_neighbors(
            node_type, base_node.id, base_node, depth, direction or "both", limit=None
        )
        
        # Build ID mapping: internal_id -> formatted_id
        id_mapping = {}
        nodes_list = []
        
        # Process nodes and build mapping
        for node_data in result["nodes"]:
            internal_id = node_data.get("id", "")  # e.g., "j1688", "t1690"
            ntype = node_data.get("type", "")
            
            # Get actual identifier
            if ntype == "job":
                actual_id = node_data.get("job_id") or node_data.get("name", "")
                label = node_data.get("name", actual_id)
            else:  # table
                actual_id = node_data.get("full_name") or node_data.get("name", "")
                label = actual_id
            
            formatted_id = f"{ntype}:{actual_id}"
            id_mapping[internal_id] = formatted_id
            
            # Extract properties
            properties = {}
            if "owner" in node_data:
                properties["owner"] = node_data["owner"]
            if "status" in node_data:
                properties["status"] = node_data["status"]
            if "enabled" in node_data:
                properties["enabled"] = node_data["enabled"]
            
            node_schema = GraphNodeSchema(
                id=formatted_id,
                type=ntype,
                label=label,
                properties=properties
            )
            nodes_list.append(node_schema)
        
        # Process edges using ID mapping
        edges_list = []
        for edge_data in result["edges"]:
            source_internal = edge_data.get("source", "")
            target_internal = edge_data.get("target", "")
            io_type = edge_data.get("io", "")
            
            # Map to formatted IDs
            source_formatted = id_mapping.get(source_internal, source_internal)
            target_formatted = id_mapping.get(target_internal, target_internal)
            
            # Determine edge type
            if io_type == "output":
                mermaid_type = "writes"
            elif io_type == "input":
                mermaid_type = "reads"
            else:
                mermaid_type = "related"
            
            edge_schema = GraphEdgeSchema(
                source=source_formatted,
                target=target_formatted,
                type=mermaid_type,
                properties={}
            )
            edges_list.append(edge_schema)
        
        # Apply node limit
        truncated = False
        if len(nodes_list) > self.MAX_NODES:
            nodes_list = nodes_list[:self.MAX_NODES]
            truncated = True
        
        # Build metadata
        metadata = GraphMetadata(
            total_nodes=len(nodes_list),
            depth=depth,
            truncated=truncated,
            max_nodes_reached=truncated
        )
        
        return MermaidGraphResponse(
            nodes=nodes_list,
            edges=edges_list,
            metadata=metadata
        )

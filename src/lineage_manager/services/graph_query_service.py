import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import text

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

from lineage_manager.core.config import get_settings
from lineage_manager.core.uow import GraphUnitOfWork

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

    def _cache_set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        if not self.redis_enabled or not self._r:
            return
        try:
            if ttl is None:
                ttl = 5 if key == "health_stats" else self.redis_ttl
            self._r.setex(key, ttl, json.dumps(value))
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

    def get_table_triggers(self, table_name: str):
        key = f"triggers:{table_name}"
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
                    "trigger": bool(is_on),
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

    MAX_SNAPSHOT_TTL = 3600  # 1 hour
    SNAPSHOT_KEY_V1 = "graph_snapshot_v1"

    def invalidate_graph_snapshot(self):
        """Invalidate the graph snapshot cache to force a rebuild on next read."""
        if not self.redis_enabled or not self._r:
            return
        try:
            self._r.delete(self.SNAPSHOT_KEY_V1)
            logger.info("Invalidated graph snapshot cache")
        except Exception as e:
            logger.warning(f"Failed to invalidate graph snapshot: {e}")

    def _get_graph_snapshot(self):
        """
        Builds or retrieves a lightweight graph snapshot (adjacency list).
        Returns:
            {
                "nodes": {id: {id, full_name, type, ...}},
                "edges": {source_id: {target_id: {edge_type, ...}}},
                "reverse_edges": {target_id: {source_id: {edge_type, ...}}},
                "full_name_map": {full_name: id}
            }
        """
        key = self.SNAPSHOT_KEY_V1
        cached = self._cache_get(key)
        if cached:
            return cached

        # 1. Fetch all nodes
        # We need ID, type, full_name/job_id to map things
        # This might be heavy if > 100k nodes, but acceptable for < 10k
        uow = self.uow
        # Raw SQL might be faster for bulk fetch
        nodes_query = text("SELECT id, node_type, name FROM graph_node")
        nodes = uow.db.execute(nodes_query).mappings().all()
        
        node_map = {}
        name_map = {}
        
        for n in nodes:
            nid = n["id"]
            name = n["name"]
            ntype = n["node_type"]
            # job_id is name for jobs
            jid = name if ntype == "job" else None
            
            node_map[str(nid)] = {
                "id": nid,
                "type": ntype,
                "name": name,
                "job_id": jid
            }
            if name:
                 name_map[name] = nid

        # 2. Fetch all edges
        edges_query = text("SELECT source_node_id, target_node_id, edge_type, is_trigger_on FROM graph_edge")
        edges_rows = uow.db.execute(edges_query).mappings().all()

        adj = {}
        rev_adj = {}

        for e in edges_rows:
            src = str(e["source_node_id"])
            dst = str(e["target_node_id"])
            etype = e["edge_type"]
            
            # Forward
            if src not in adj: adj[src] = {}
            adj[src][dst] = {"type": etype}
            
            # Reverse
            if dst not in rev_adj: rev_adj[dst] = {}
            rev_adj[dst][src] = {"type": etype}

        snapshot = {
            "nodes": node_map,
            "edges": adj,
            "reverse_edges": rev_adj,
            "full_name_map": name_map
        }
        
        # Cache for short duration
        self._cache_set(key, snapshot, ttl=self.MAX_SNAPSHOT_TTL)
        return snapshot

    def get_table_lineage_summary(
        self,
        table_name: str,
        max_roots: int = 50,
        max_leaves: int = 50,
        max_preview_paths: int = 4,
        max_full_paths: int = 25,
    ):
        # Use Snapshot Strategy
        snapshot = self._get_graph_snapshot()
        nodes = snapshot["nodes"]
        edges = snapshot["edges"]
        rev_edges = snapshot["reverse_edges"]
        name_map = snapshot["full_name_map"]

        # Resolve Center ID
        center_id = name_map.get(table_name)
        if not center_id:
             return {
                "status": "error",
                "message": f"Table '{table_name}' not found",
            }
        center_id = str(center_id)

        # In-Memory BFS Traversal
        upstream_tables, upstream_jobs = set(), set()
        downstream_tables, downstream_jobs = set(), set()
        upstream_roots, downstream_leaves = [], []
        upstream_paths, downstream_paths = [], []
        upstream_depth = 0
        downstream_depth = 0

        # --- Upstream (Reverse Edges) ---
        # Queue: (current_id, depth, path_of_names)
        queue = deque([(center_id, 0, [table_name])])
        visited = set() # track visited nodes to avoid cycles
        
        while queue:
            curr_id, depth, path = queue.popleft()
            if curr_id in visited: continue
            visited.add(curr_id)

            # Get parents (incoming edges)
            parents = rev_edges.get(curr_id, {})
            # Filter for Job nodes that WRITE to current node (output)
            # wait, architecture is: Job --read--> Table OR Job --write--> Table
            # Actually, standard flow: Table A -> Job 1 -> Table B
            # Edges: (A -> Job1 type=read), (Job1 -> B type=write)
            
            # Implementation detail: 'rev_edges' of Table B are (Job1 -> B). Source is Job1.
            # So parents of Table B are likely Jobs.
            
            has_upstream = False
            for pid, meta in parents.items():
                pnode = nodes.get(pid)
                if not pnode: continue
                
                # If current is Table, parent must be Job (Writer)
                if pnode["type"] == "job":
                    # Capture Job Writer
                    job_key = pnode.get("job_id") or pnode.get("name")
                    upstream_jobs.add(job_key)
                    
                    # Traverse further up from Job
                    # Job inputs are 'read' edges. (Table -> Job)
                    # So look at 'rev_edges' of Job
                    grandparents = rev_edges.get(pid, {})
                    for gpid, gmeta in grandparents.items():
                        gpnode = nodes.get(gpid)
                        if gpnode and gpnode["type"] == "table":
                            has_upstream = True
                            if gpnode["name"] in path: continue # cycle check
                            
                            upstream_tables.add(gpnode["name"])
                            next_path = [gpnode["name"]] + path
                            queue.append((gpid, depth + 1, next_path))
                            upstream_depth = max(upstream_depth, depth + 1)

            if not has_upstream and curr_id != center_id:
                 # It's a root (or stopped at job)
                 curr_node = nodes[curr_id]
                 if curr_node["type"] == "table":
                     if curr_node["name"] not in upstream_roots:
                        upstream_roots.append(curr_node["name"])
                     upstream_paths.append(list(path))

        # --- Downstream (Forward Edges) ---
        queue = deque([(center_id, 0, [table_name])])
        visited = set()
        
        while queue:
            curr_id, depth, path = queue.popleft()
            if curr_id in visited: continue
            visited.add(curr_id)

            # Children (outgoing edges)
            # Table -> (read) -> Job
            children = edges.get(curr_id, {})
            
            has_downstream = False
            for cid, meta in children.items():
                cnode = nodes.get(cid)
                if not cnode: continue
                
                if cnode["type"] == "job":
                    # Capture Job Reader
                    job_key = cnode.get("job_id") or cnode.get("name")
                    downstream_jobs.add(job_key)
                    
                    # Traverse further down from Job
                    # Job outputs (write) -> Table
                    grandchildren = edges.get(cid, {})
                    for gcid, gmeta in grandchildren.items():
                         gcnode = nodes.get(gcid)
                         if gcnode and gcnode["type"] == "table":
                             has_downstream = True
                             if gcnode["name"] in path: continue
                             
                             downstream_tables.add(gcnode["name"])
                             next_path = path + [gcnode["name"]]
                             queue.append((gcid, depth + 1, next_path))
                             downstream_depth = max(downstream_depth, depth + 1)
            
            if not has_downstream and curr_id != center_id:
                 curr_node = nodes[curr_id]
                 if curr_node["type"] == "table":
                     if curr_node["name"] not in downstream_leaves:
                        downstream_leaves.append(curr_node["name"])
                     downstream_paths.append(list(path))

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
            "table": table_name,
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
                "tables": sorted(list(upstream_tables)),
                "jobs": sorted(list(upstream_jobs)),
            },
            "downstream": {
                "downstream_tables": uniq_list(downstream_leaves)[:max_leaves], # fix key name mismatch
                "leaf_tables": uniq_list(downstream_leaves)[:max_leaves],
                "tables": sorted(list(downstream_tables)),
                "jobs": sorted(list(downstream_jobs)),
            },
            "paths": {
                "preview": [list(path) for path in preview_paths],
                "full": [list(path) for path in full_paths],
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if res.get("status") == "success":
             # Indicate that we used the snapshot cache (effectively)
             res["cache"] = {
                 "cached": True, # Always "cached" in the sense that graph is from snapshot
                 "expires_in_sec": self.MAX_SNAPSHOT_TTL,
             }
        return res

    def get_job(self, job_id: str):
        """Return a job row enriched with derived fields from job_metadata."""
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        meta = job.job_metadata or {}
        # derive defaults
        status = meta.get("status", "pending")
        enabled = bool(meta.get("enabled", True))
        # attach for response usage
        setattr(job, "status", status)
        options = {}
        setattr(job, "enabled", enabled)
        return job

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

try:
    from rapidfuzz import process, fuzz
except ImportError:
    process = None
    fuzz = None

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

    def _cache_set(self, key: str, value: Dict[str, Any], expire: int = None) -> None:
        if not self.redis_enabled or not self._r:
            return
        ttl = expire if expire is not None else self.redis_ttl
        try:
            self._r.setex(key, ttl, json.dumps(value))
        except Exception:
            pass

    # Read APIs with caching wrappers
    def check_health(self):
        """Lightweight health check for K8s probes"""
        return {
            "status": "healthy",
            "service": "lineage-manager",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def get_diagnostics(self):
        key = "health_stats"
        cached = self._cache_get(key)
        if cached:
            return cached

        logger.info("Starting health check statistics collection")
        try:
            with self.uow:
                stats = {}
                # Count jobs
                stats["job_count"] = self.uow.jobs.count_jobs()

                # Count tables
                stats["table_count"] = self.uow.tables.count_tables()

                # Count edges
                stats["edge_count"] = self.uow.edges.count_all()

                # Count closures
                stats["closure_count"] = self.uow.closures.count_all()

                # Database status
                try:
                    self.uow.db.execute(text("SELECT 1"))
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

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Get summary metrics for the dashboard landing page.
        Returns a mix of real DB counts and initialized placeholder values.
        """
        with self.uow:
            total_tables = self.uow.tables.count_tables()
            total_jobs = self.uow.jobs.count_jobs()
            total_users = self.uow.users.count_users()
            
            # Get job type distribution in one query
            distribution = self.uow.jobs.count_jobs_by_type_distribution()
            
            self_type_jobs = distribution.get("SELF-TYPE", 0)
            request_type_jobs = distribution.get("REQUEST-TYPE", 0)

        return {
            "total_tables": total_tables,
            "total_jobs": {
                "count": total_jobs,
                "breakdown": [
                    {"label": "Self-Type", "value": self_type_jobs},
                    {"label": "Request-Type", "value": request_type_jobs},
                ],
            },
            "total_users": total_users,
            "system_health": "85%",
            "active_alerts": 12,
            "daily_ingestion": "2.4 TB",
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

        with self.uow:
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
        with self.uow:
            # Resolve base table
            table = self.uow.tables.get_by_full_name(base_table)
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
                consumer_jobs = self.uow.job_table_links.get_jobs_by_table_and_io_type(
                    current_id, "input"
                )

                # For each consuming job, collect its output tables
                for job in consumer_jobs:
                    out_tables = self.uow.job_table_links.get_tables_by_job_and_io_type(
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
                            writers = self.uow.job_table_links.get_jobs_by_table_and_io_type(
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
        self,
        job_id: str,
        level: int = 1,
        direction: str = "both",
        limit: int | None = None,
    ):
        lim = "none" if limit is None else str(limit)
        key = f"neighbors:job:{job_id}:{level}:{direction}:{lim}"
        cached = self._cache_get(key)
        if cached:
            return cached

        # Implementation via traversal helper
        with self.uow:
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

    def get_job_lineage(
        self,
        job_id: str,
        depth: int = 1,
        direction: str = "both",
    ):
        """
        Get structured lineage for a job, separated by upstream/downstream.
        """
        key = f"lineage:job:{job_id}:{depth}:{direction}"
        cached = self._cache_get(key)
        if cached:
            return cached

        with self.uow:
            job = self.uow.jobs.get(job_id)
            if not job:
                return {"status": "error", "message": f"Job '{job_id}' not found"}

            # Initialize empty structures
            upstream_data = {"nodes": [], "edges": []}
            downstream_data = {"nodes": [], "edges": []}

            # Upstream traversal
            if direction in ("upstream", "both"):
                up_res = self._traversal.bfs_neighbors(
                    "job", job.id, job, depth, "upstream"
                )
                upstream_data = up_res

            # Downstream traversal
            if direction in ("downstream", "both"):
                down_res = self._traversal.bfs_neighbors(
                    "job", job.id, job, depth, "downstream"
                )
                downstream_data = down_res

            # Deduplicate nodes by ID
            unique_nodes = {}
            for node in upstream_data["nodes"] + downstream_data["nodes"]:
                if node["id"] not in unique_nodes:
                    unique_nodes[node["id"]] = node
            
            # Deduplicate edges by source-target-io
            unique_edges = set()
            final_edges = []
            for edge in upstream_data["edges"] + downstream_data["edges"]:
                edge_key = (edge["source"], edge["target"], edge.get("io"))
                if edge_key not in unique_edges:
                    unique_edges.add(edge_key)
                    final_edges.append(edge)

            # Define graph data for visualization
            lineage_graph = {
                "nodes": list(unique_nodes.values()),
                "edges": final_edges,
            }
            
            # --- Map to Hybrid Response (Inputs / Outputs) ---
            inputs = []
            for node in upstream_data["nodes"]:
                 if node["type"] == "table":
                     # Logic to extract InputTableInfo metrics
                     inputs.append({
                         "id": node["id"],
                         "name": node["name"],
                         "storage_type": "BQ", # Placeholder
                         "read_mode": "FULL", # Placeholder
                         "freshness": "00:00", # Placeholder
                         "quality_status": "PASS",
                         "row_count": 0,
                         "owner": node.get("owners", [""])[0] if node.get("owners") else None,
                         "criticality": "LOW"
                     })

            outputs = []
            for node in downstream_data["nodes"]:
                if node["type"] == "table":
                     # Logic to extract OutputTableInfo metrics
                     outputs.append({
                         "id": node["id"],
                         "name": node["name"],
                         "storage_type": "BQ",
                         "write_mode": "APPEND",
                         "recent_volume": 0,
                         "consumer_count": 0,
                         "sla_status": "MET"
                     })

            response = {
                "job_id": job_id,
                "inputs": inputs,
                "outputs": outputs,
                "graph": lineage_graph
            }

        self._cache_set(key, response)
        return response

    def get_job_health(self, job_id: str):
        """
        Get job health status (mix of real and dummy data).
        """
        key = f"health:job:{job_id}"
        # Health should have short TTL or no cache usually, but for now 30s
        cached = self._cache_get(key)
        if cached:
            return cached

        with self.uow:
            job = self.uow.jobs.get(job_id)
            if not job:
                return {"status": "error", "message": f"Job '{job_id}' not found"}

            # 1. Real Data (from Job/History)
            # Try to find last execution from history
            from lineage_manager.services.job_service import JobService
            # We can't easily inject JobService here due to circular deps, 
            # so we query the repository or models directly if needed.
            # For MVP, we'll use placeholder or basic properties.
            
            # Use 'updated_at' from job if available
            updated_at = getattr(job, "updated_at", None)
            if updated_at:
                updated_at_str = updated_at.isoformat()
            else:
                from datetime import datetime
                updated_at_str = datetime.utcnow().isoformat()

            # 2. Dummy Data (as requested)
            # Freshness
            freshness = {
                "last_updated": updated_at_str[11:16],  # HH:MM
                "sla": "03:00",
                "delay": 59  # Dummy
            }

            # Last Run (Mocking success)
            last_run = {
                "result": "SUCCESS",
                "duration": "12m 32s",
                "ended_at": "02:03"
            }

            # Execution
            execution = {
                "mode": "INCREMENTAL",
                "partition": f"dt={updated_at_str[:10]}"
            }

            response = {
                "job_id": job_id,
                "updated_at": updated_at_str,
                "health": {
                    "freshness": freshness,
                    "last_run": last_run,
                    "execution": execution
                }
            }

        self._cache_set(key, response, expire=30)
        return response

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
        with self.uow:
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

        # If term is very short or rapidfuzz missing, fallback to SQL LIKE
        if len(term) < 2 or process is None:
            jobs = self.uow.jobs.search_by_prefix(prefix=term, limit=limit)
            tables = self.uow.tables.search_by_prefix(prefix=term, limit=limit)
            owners = self.uow.jobs.search_owners_by_prefix(prefix=term, limit=limit)

            return {
                "query": term,
                "jobs": [
                    {
                        "job_id": job.job_id or job.name,
                        "name": job.display_name,
                        "owners": job.owners,
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
                "owners": [o["name"] for o in owners],
            }

        # Fuzzy Search Logic
        corpus = self._get_fuzzy_search_corpus()
        if not corpus:
            return {"query": term, "tables": [], "jobs": [], "owners": []}

        # Extract matches
        # choices is list of strings: [item['text'] for item in corpus]
        choices = [item["text"] for item in corpus]
        
        # rapidfuzz returns list of (match, score, index)
        results = process.extract(
            term, choices, limit=limit, scorer=fuzz.partial_ratio, score_cutoff=40
        )

        matched_jobs = []
        matched_tables = []
        seen_owners = set()
        matched_owners = []

        for match, score, idx in results:
            item = corpus[idx]
            if item["type"] == "job":
                job_owners = item["data"].get("owners") or []
                matched_jobs.append(
                    {
                        "job_id": item["id"],
                        "name": item["data"].get("name"),
                        "owners": job_owners,
                    }
                )
                for owner in job_owners:
                    if owner and owner not in seen_owners:
                        seen_owners.add(owner)
                        matched_owners.append(owner)

            elif item["type"] == "table":
                matched_tables.append(
                    {
                        "full_name": item["id"],
                        "table_name": item["data"].get("table_name"),
                        "project": item["data"].get("project"),
                        "dataset": item["data"].get("dataset"),
                    }
                )

        # Separate owner search: also fuzz match purely on owners if needed?
        # The user requested "JOB_ID, OWNER, TABLE_NAME". 
        # My corpus text construction should include OWNER so they are found in the main loop.

        return {
            "query": term,
            "jobs": matched_jobs,
            "tables": matched_tables,
            "owners": matched_owners,
        }

    def _get_fuzzy_search_corpus(self):
        """Builds or retrieves cached list of search terms."""
        key = "fuzzy_search_corpus_v1"
        cached = self._cache_get(key)
        if cached:
            return cached

        with self.uow:
            # Fetch raw rows
            job_rows = self.uow.jobs.get_all_search_terms()
            table_rows = self.uow.tables.get_all_search_terms()

        corpus = []
        for j in job_rows:
            # j keys: job_id, display_name, owners
            # Combine for search text
            parts = [
                j.job_id,
                j.display_name,
            ]
            if j.owners:
                parts.extend(j.owners)
            
            text_val = " ".join([str(p) for p in parts if p])
            corpus.append({
                "type": "job",
                "id": j.job_id,
                "text": text_val,
                "data": {
                    "name": j.display_name,
                    "owners": j.owners or []
                }
            })

        for t in table_rows:
            # t keys: full_name, table_name, project, dataset
            parts = [
                t.full_name,
                t.table_name
            ]
            text_val = " ".join([str(p) for p in parts if p])
            corpus.append({
                "type": "table",
                "id": t.full_name,
                "text": text_val,
                "data": {
                    "table_name": t.table_name or t.full_name,
                    "project": t.project,
                    "dataset": t.dataset
                }
            })
        
        # Cache for 5 minutes (300s)
        self._cache_set(key, corpus)
        return corpus

    def get_table_dependencies(self, table_name: str):
        key = f"dependencies:{table_name}"
        cached = self._cache_get(key)
        if cached:
            return cached

        with self.uow:
            table = self.uow.tables.get_by_full_name(table_name)
            if not table:
                # If it's an external storage path but not found, return empty success instead of error
                # to be consistent with how TableService handled it previously, but now we attempt query first.
                if table_name.startswith(("s3://", "gs://", "gcs://")) or "/" in table_name:
                    return {
                        "status": "success",
                        "table": table_name,
                        "count": 0,
                        "jobs": [],
                    }
                return {"status": "error", "message": f"Table '{table_name}' not found"}

            rows = self.uow.job_table_links.get_job_inputs_with_trigger_flag(table.id)

            items = []
            for job, dep_type_value in rows:
                job_id = getattr(job, "job_id", None) or job.name
                job_name = getattr(job, "display_name", None) or job.name or job_id
                # dep_type_value is the dependency_type string from the edge
                dependency_type = (
                    dep_type_value
                    if isinstance(dep_type_value, str)
                    else ("HARD" if dep_type_value else "SOFT")
                )
                items.append(
                    {
                        "job_id": job_id,
                        "name": job_name,
                        "dependency_type": dependency_type,
                    }
                )

        res = {
            "status": "success",
            "table": table_name,
            "count": len(items),
            "jobs": items,
        }
        self._cache_set(key, res)
        return res

    def get_table_lineage_hierarchy(self, table_name: str, max_depth: int = 20):
        # Implementation via traversal helper
        with self.uow:
            center = self.uow.tables.get_by_full_name(table_name)
            if not center:
                return {
                    "status": "error",
                    "message": f"Table '{table_name}' not found",
                    "upstream": [],
                    "downstream": [],
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
                "properties": getattr(center, "properties", {}) or {},
            }

            # Prepend center node to both lists
            upstream.insert(0, center_node)
            downstream.insert(0, center_node)

        return {
            "status": "success",
            "upstream": upstream,
            "downstream": downstream,
            "root_nodes": roots,
            "leaf_nodes": leaves,
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

        try:
            with self.uow:
                table = self.uow.tables.get_by_full_name(table_name)
                if not table:
                    # Leniency for external storage paths (S3/GCS)
                    if (
                        table_name.startswith(("s3://", "gs://", "gcs://"))
                        or "/" in table_name
                    ):
                        return {
                            "status": "success",
                            "table": table_name,
                            "metrics": {
                                "root_count": 0,
                                "leaf_count": 0,
                                "upstream_table_count": 0,
                                "downstream_table_count": 0,
                                "upstream_job_count": 0,
                                "downstream_job_count": 0,
                                "depth": {"upstream": 0, "downstream": 0},
                            },
                            "upstream": {"root_tables": [], "tables": [], "jobs": []},
                            "downstream": {"leaf_tables": [], "tables": [], "jobs": []},
                            "paths": {"preview": [], "full": []},
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }

                    return {
                        "status": "error",
                        "error_code": "TABLE_NOT_FOUND",
                        "message": f"Table '{table_name}' not found",
                    }

                # 1. Use Closure Table for linear-time metrics collection
                # Get all upstream and downstream nodes (Fast O(N) database lookup)
                up_nodes = self.uow.closures.get_upstream_nodes(table.id)
                down_nodes = self.uow.closures.get_downstream_nodes(table.id)

                upstream_tables = sorted(
                    list(set([n["full_name"] for n in up_nodes if n["type"] == "table"]))
                )
                upstream_jobs = sorted(
                    list(set([n["full_name"] for n in up_nodes if n["type"] == "job"]))
                )
                downstream_tables = sorted(
                    list(set([n["full_name"] for n in down_nodes if n["type"] == "table"]))
                )
                downstream_jobs = sorted(
                    list(set([n["full_name"] for n in down_nodes if n["type"] == "job"]))
                )

                # Depth metrics
                max_up_depth = max([n["depth"] for n in up_nodes]) if up_nodes else 0
                max_down_depth = max([n["depth"] for n in down_nodes]) if down_nodes else 0

                # 2. Identify Roots and Leaves using Closure data
                # Simplified: Nodes at maximum depth are usually roots/leaves in the context of this table
                roots = [
                    n["full_name"]
                    for n in up_nodes
                    if n["depth"] == max_up_depth and n["type"] == "table"
                ]
                leaves = [
                    n["full_name"]
                    for n in down_nodes
                    if n["depth"] == max_down_depth and n["type"] == "table"
                ]

                # 3. Restricted BFS for Preview Paths (Shallow only)
                preview_paths = []
                if max_up_depth > 0:
                    # Find one or two quick paths upstream
                    queue = deque([(table, 0, [table.full_name])])
                    visited = {table.id}
                    while queue and len(preview_paths) < 2:
                        curr, d, p = queue.popleft()
                        if d >= 3:
                            continue
                        prods = self.uow.job_table_links.get_jobs_by_table_and_io_type(
                            curr.id, "output"
                        )
                        if not prods:
                            if d > 0:
                                preview_paths.append(list(p))
                            continue
                        for j in prods[:2]:
                            ins = self.uow.job_table_links.get_tables_by_job_and_io_type(
                                j.id, "input"
                            )
                            for t in ins[:1]:
                                if t.id not in visited:
                                    visited.add(t.id)
                                    queue.append((t, d + 1, [t.full_name] + p))

                res = {
                    "status": "success",
                    "table": table.full_name,
                    "metrics": {
                        "root_count": len(roots),
                        "leaf_count": len(leaves),
                        "upstream_table_count": len(upstream_tables),
                        "downstream_table_count": len(downstream_tables),
                        "upstream_job_count": len(upstream_jobs),
                        "downstream_job_count": len(downstream_jobs),
                        "depth": {
                            "upstream": max_up_depth,
                            "downstream": max_down_depth,
                        },
                    },
                    "upstream": {
                        "root_tables": roots[:max_roots],
                        "tables": upstream_tables,
                        "jobs": upstream_jobs,
                    },
                    "downstream": {
                        "leaf_tables": leaves[:max_leaves],
                        "tables": downstream_tables,
                        "jobs": downstream_jobs,
                    },
                    "paths": {
                        "preview": preview_paths,
                        "full": preview_paths,
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
        with self.uow:
            job = self.uow.jobs.get(job_id)
            if not job:
                return None

            # Eagerly load properties and expunge to avoid DetachedInstanceError outside session scope
            _ = job.properties
            self.uow.db.expunge(job)

            # derive defaults
            # Primary: Try top-level properties (new behavior is flattened)
            status = job._get_prop("status")
            enabled = job._get_prop("enabled")

            # Fallback: legacy support for nested structures
            if not status or status == "unknown":
                # Check legacy keys
                for key in ["job_meta", "job_metadata"]:
                    jm = job._get_prop(key)
                    if jm and isinstance(jm, dict):
                        status = jm.get("status")
                        if status: break
            
            # attach for response usage
            setattr(job, "status", status or "unknown")
            setattr(job, "enabled", enabled if enabled is not None else True)
            return job

    def get_nodes_batch_details(self, node_ids: list[str]):
        """Fetch details for multiple nodes (tables/jobs) in one query, returning nested Table/Job info."""
        if not node_ids:
            return {"status": "success", "results": {}}

        # Normalize and filter
        node_ids = list(set(nid for nid in node_ids if nid))
        
        # 1. Fetch all requested nodes via repository
        with self.uow:
            nodes = self.uow.nodes.get_by_names(node_ids)
            node_map = {n.name: n for n in nodes}

            # 2. Identify table nodes and find their producers
            table_nodes = [n for n in nodes if n.node_type == "table"]
            table_node_ids = [n.id for n in table_nodes]
            producer_map = {}  # table_node_id -> GraphNode (job)

            if table_node_ids:
                # Query producers via repository
                producer_results = self.uow.job_table_links.get_producer_jobs_by_table_ids(table_node_ids)
                for t_id, job_node in producer_results:
                    if t_id not in producer_map:
                        producer_map[t_id] = job_node

            results = {}
            for nid in node_ids:
                node = node_map.get(nid)
                if not node:
                    results[nid] = self._make_empty_node_details(nid)
                    continue

                ntype = getattr(node, "node_type", "unknown")
                nid_db = getattr(node, "id", None)
                props = getattr(node, "properties", {}) or {}

                # Table Info Section
                table_info = {
                    "id": getattr(node, "name", nid),
                    "type": ntype,
                    "write_mode": getattr(node, "write_mode", None) or props.get("write_mode") or "-",
                    "storage_type": getattr(node, "storage_type", None) or props.get("storage_type") or "-",
                }

                # Job Info Section
                job_node = None
                if ntype == "job":
                    job_node = node
                else:
                    job_node = producer_map.get(nid_db)

                if job_node:
                    j_props = getattr(job_node, "properties", {}) or {}
                    j_sched = j_props.get("schedule") or {}
                    
                    # Reconstruct job_info from flattened properties
                    job_info = {
                        "job_id": getattr(job_node, "name", "-"),
                        "owners": getattr(job_node, "owners", []) or j_props.get("owners") or [],
                        "status": j_props.get("status") or "-",
                        "run_status": j_props.get("run_status") or "-",
                        "interval": j_sched.get("cron") or j_sched.get("interval") or "-",
                        "start_date": j_sched.get("start_date") or "-",
                        "end_date": j_sched.get("end_date") or "-",
                        "job_meta": j_props,
                        "type": j_props.get("type") or j_props.get("logic_type") or "-",
                    }
                else:
                    job_info = {
                        "job_id": "-",
                        "owners": [],
                        "status": "-",
                        "run_status": "-",
                        "interval": "-",
                        "start_date": "-",
                        "end_date": "-",
                        "job_meta": None,
                        "type": None,
                    }
                results[nid] = {"table_info": table_info, "job_info": job_info}

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
                "owners": [],
                "status": "not_found",
                "run_status": "-",
                "interval": "-",
                "start_date": "-",
                "end_date": "-",
                "job_meta": None,
                "type": None,
            },
        }

    # ============================================================================
    # New Lineage Graph API for Mermaid Viewer (Cytoscape Migration)
    # ============================================================================

    MAX_NODES = 30
    MAX_EDGES = 50
    MAX_DEPTH = 2

    def get_lineage_graph(
        self, node_id: str, depth: int = 1, direction: Optional[str] = None
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
            MermaidGraphResponse,
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
            if "owners" in node_data:
                properties["owners"] = node_data["owners"]
            elif "owner" in node_data:
                # Handle legacy if any
                val = node_data["owner"]
                properties["owners"] = [val] if val else []
            if "status" in node_data:
                properties["status"] = node_data["status"]
            if "enabled" in node_data:
                properties["enabled"] = node_data["enabled"]

            node_schema = GraphNodeSchema(
                id=formatted_id, type=ntype, label=label, properties=properties
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
                properties={},
            )
            edges_list.append(edge_schema)

        # Apply node limit
        truncated = False
        if len(nodes_list) > self.MAX_NODES:
            nodes_list = nodes_list[: self.MAX_NODES]
            truncated = True

        # Build metadata
        metadata = GraphMetadata(
            total_nodes=len(nodes_list),
            depth=depth,
            truncated=truncated,
            max_nodes_reached=truncated,
        )

        return MermaidGraphResponse(
            nodes=nodes_list, edges=edges_list, metadata=metadata
        )

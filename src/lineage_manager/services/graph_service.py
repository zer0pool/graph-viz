import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from lineage_manager.adapters.job_manager_adapter import (
    JobManagerAdapter,
    JobManagerPort,
)
from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.models.scheduling_lineage import SchedulingLineage

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self, uow: GraphUnitOfWork, job_manager: JobManagerAdapter):
        self.uow = uow
        self.job_manager = job_manager

    # -----------------------------
    # Jobs (detail, dependencies, toggle)
    # -----------------------------
    def get_job(self, job_id: str):
        """Return a job row enriched with derived fields from job_metadata.

        - status, enabled are stored under job.job_metadata for persistence
        - For convenience, expose them as attributes on the instance
        """
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        meta = job.job_metadata or {}
        # derive defaults
        status = meta.get("status", "pending")
        enabled = bool(meta.get("enabled", True))
        # attach for response usage
        setattr(job, "status", status)
        setattr(job, "enabled", enabled)
        return job

    def get_job_dependencies(self, job_id: str, max_depth: int = 1):
        """Return neighbors-style dependencies around a job up to max_depth."""
        try:
            return self.get_job_neighbors(
                job_id=job_id, level=max_depth, direction="both"
            )
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def toggle_job_enabled(self, job_id: str):
        """Flip enabled flag stored in job.job_metadata and expose attribute."""
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        meta = dict(job.job_metadata or {})
        current = bool(meta.get("enabled", True))
        meta["enabled"] = not current
        # keep status default if missing
        meta.setdefault("status", "pending")
        job.job_metadata = meta
        # also attach for response convenience
        setattr(job, "enabled", meta["enabled"])
        setattr(job, "status", meta.get("status"))
        return job

    def register_job(self, job_data: JobRegister) -> str:
        """
        Register a new job in the system using Unit of Work pattern.

        - FastAPI stores session in state for each request
        - GraphContainer creates uow based on session
        - GraphService uses the same session
        """
        logger.info(f"Starting job registration for job_id: {job_data.job_id}")
        logger.debug(f"Job data: {job_data.model_dump()}")

        uow = self.uow  # Session/transaction injected per request
        logger.debug("UoW initialized successfully")

        try:
            logger.info(f"Creating job with job_id: {job_data.job_id}")
            job = uow.jobs.get_or_create(
                job_data.job_id,
                labels=job_data.labels if job_data.labels else {},
                owner=job_data.owner,
                write_mode=job_data.write_mode,
                destination_type=job_data.destination_type,
                destination_table=job_data.destination_table,
                trigger_tables=job_data.trigger_tables,
                reference_tables=job_data.reference_tables,
                job_metadata=job_data.metadata or {},
            )
            logger.info(f"Job created/retrieved successfully: {job.job_id}")

            in_ids, out_ids = [], []

            # Process reference tables
            logger.info(f"Processing {len(job_data.reference_tables)} reference tables")
            for t in job_data.reference_tables:
                logger.debug(f"Processing reference table: {t}")
                tbl = uow.tables.get_or_create(t)
                in_ids.append(tbl.id)
                # Create job-table link in the dedicated repository
                uow.job_table_links.link_job_table(job.id, tbl.id, "input")
                # Create edge in the graph_edge repository
                is_trigger_on = t in job_data.trigger_tables
                uow.edges.create_job_table_edge(
                    job.id, tbl.id, "input", is_trigger_on=is_trigger_on
                )
                logger.debug(f"Linked input table {t} to job {job.id}")

            # Process destination table
            if job_data.destination_table:
                logger.info(
                    f"Processing destination table: {job_data.destination_table}"
                )
                tbl = uow.tables.get_or_create(job_data.destination_table)
                out_ids.append(tbl.id)
                # Create job-table link in the dedicated repository
                uow.job_table_links.link_job_table(job.id, tbl.id, "output")
                # Create edge in the graph_edge repository
                uow.edges.create_job_table_edge(job.id, tbl.id, "output")
                logger.debug(
                    f"Linked output table {job_data.destination_table} to job {job.name}"
                )

            # Calculate upstream relationships
            logger.info("Calculating upstream relationships")
            logger.debug(f"Input table IDs: {in_ids}")

            # Use repository method to find upstream jobs
            up_jobs = []
            if in_ids:
                try:
                    up_jobs = uow.jobs.find_upstream_jobs_by_output_tables(
                        in_ids, job.id
                    )
                    logger.debug(f"Found upstream jobs: {up_jobs}")
                except Exception as e:
                    logger.error(f"Error querying upstream jobs: {e}")
                    up_jobs = []

            # Create edges and closures for upstream relationships
            for up in up_jobs:
                logger.debug(f"Creating dependency edge: {up} -> {job.id}")
                uow.edges.add(up, job.id, "job", "job", "dependency")
                uow.closures.add_direct(up, job.id)
                uow.closures.expand_closure(up, job.id)

            logger.info(
                f"Job registration completed successfully for job_id: {job.name}"
            )
            # Ensure changes persist within the current request
            try:
                uow.commit()
            except Exception:
                # If commit fails, rollback and re-raise
                uow.rollback()
                raise
            return job.id

        except Exception as e:
            logger.error(
                f"Error during job registration for job_id {job_data.job_id}: {e}"
            )
            logger.exception("Full traceback:")
            raise

    def register_lineage_job(self, lineage: SchedulingLineage) -> str:
        """
        Register a job described via SchedulingLineage payload.
        """
        job_payload = JobDataTransformer.lineage_to_job_register(lineage)
        return self.register_job(job_payload)

    async def initialize_graph(self) -> Dict[str, Any]:
        """
        Initialize graph by fetching all jobs from Job Manager API
        and creating graph nodes, edges, and closure entries based on job dependencies.
        Uses the existing register_job method for consistency.
        """
        try:
            # Import here to avoid circular imports
            from lineage_manager.services.graph_initializer import (
                GraphInitializerService,
            )

            # Delegate to the dedicated initialization service
            initializer = GraphInitializerService(self.job_manager, self)
            return await initializer.initialize()
        except Exception as e:
            logger.error(f"Graph initialization failed: {e}")
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "message": f"Failed to initialize graph: {str(e)}",
                "jobs_fetched": 0,
                "successful_registrations": 0,
                "failed_registrations": 0,
                "database_stats": {},
            }

    async def sync_job_from_manager(self, job_id: str) -> Dict[str, Any]:
        try:
            jd = await self.job_manager.get_job(job_id)
            if not jd:
                return {
                    "status": "error",
                    "message": f"Job '{job_id}' not found in manager",
                }

            # Use the JobDataTransformer to transform the job data
            transformed_data = JobDataTransformer.transform_job_to_graph_node(jd)

            # Extract destination table from transformed data
            destination_table = transformed_data.get("destination_table")

            jr = JobRegister(
                job_id=jd.get("job_id", job_id),
                name=jd.get("name", job_id),
                labels=jd.get("labels", {}),
                owner=jd.get("owner"),
                write_mode=jd.get("write_mode"),
                destination_type=jd.get("destination_type"),
                destination_table=destination_table,
                trigger_tables=transformed_data.get("trigger_tables", []),
                reference_tables=transformed_data.get("reference_tables", []),
                run_status=jd.get("run_status", "RUN"),
                schedule=jd.get("schedule"),
                destinations=jd.get("destinations"),
                metadata=transformed_data.get("job_metadata", {}),
            )
            self.register_job(jr)
            return {"status": "success", "job_id": job_id}
        except Exception as e:
            logger.error(f"sync_job_from_manager failed: {e}")
            return {"status": "error", "message": str(e)}

    async def sync_node(self, node_type: str, node_db_id: int) -> Dict[str, Any]:
        uow = self.uow
        if node_type == "job":
            job = uow.jobs.get_by_id(node_db_id)
            if not job:
                return {"status": "error", "message": f"job id={node_db_id} not found"}
            return await self.sync_job_from_manager(job.job_id)
        else:
            table = uow.tables.get_by_id(node_db_id)
            if not table:
                return {
                    "status": "error",
                    "message": f"table id={node_db_id} not found",
                }
            producers = uow.job_table_links.get_jobs_by_table_and_io_type(
                table.id, "output"
            )
            ok, fail = 0, 0
            for j in producers:
                res = await self.sync_job_from_manager(j.job_id)
                if res.get("status") == "success":
                    ok += 1
                else:
                    fail += 1
            return {
                "status": "success",
                "synced": ok,
                "failed": fail,
                "table": table.full_name,
            }

    def reset_graph(self):
        """Delete all graph-related table data"""
        uow = self.uow
        try:
            logger.info("Starting graph reset - clearing all graph data")
            # Order matters: closure → edge → job_table_link → job → table
            uow.closures.clear_all()
            uow.edges.clear_all()
            uow.job_table_links.clear_all()
            uow.jobs.clear_all()
            uow.tables.clear_all()
            uow.commit()
            logger.info("✅ Graph reset complete: all graph data cleared.")
            return {
                "status": "success",
                "message": "Graph reset complete: all graph data cleared.",
            }
        except Exception as e:
            logger.error(f"❌ Graph reset failed: {e}")
            uow.rollback()
            raise

    def get_health_stats(self):
        """Get basic database statistics for health check using repositories"""
        uow = self.uow
        logger.info("Starting health check statistics collection")

        try:
            from sqlalchemy import text

            # Get counts from each table using repositories
            stats = {}

            # Count jobs using JobRepository

            jobs = uow.jobs.list_all()
            stats["job_count"] = len(jobs)
            logger.debug(f"Found {stats['job_count']} jobs")

            # Count tables using TableRepository

            table_count = uow.tables.count_tables()
            stats["table_count"] = table_count
            logger.debug(f"Found {stats['table_count']} tables")

            # Count edges using EdgeRepository (inherited from BaseRepository)

            edge_count = uow.edges.count_all()
            stats["edge_count"] = edge_count
            logger.debug(f"Found {stats['edge_count']} edges")

            # Count closure entries using ClosureRepository (inherited from BaseRepository)

            closure_count = uow.closures.count_all()
            stats["closure_count"] = closure_count
            logger.debug(f"Found {stats['closure_count']} closure entries")

            # Get database connection status

            try:
                uow.db.execute(text("SELECT 1"))
                stats["database_status"] = "connected"
                logger.debug("Database connection test successful")
            except Exception as db_error:
                stats["database_status"] = "disconnected"
                logger.error(f"Database connection test failed: {db_error}")

            # Get timestamp
            stats["timestamp"] = datetime.now(timezone.utc).isoformat()
            logger.debug(f"Health stats completed: {stats}")

            logger.info(f"Health stats retrieved successfully: {stats}")
            return {"status": "healthy", "database": stats}

        except Exception as e:
            # Ensure logger is available in exception handler
            local_logger = logging.getLogger(__name__)
            local_logger.error(f"Health check failed with exception: {e}")
            local_logger.exception("Full traceback for health check failure:")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def get_table_dag(
        self,
        full_name: str,
        direction: str = "both",
        depth: int = 3,
        include_jobs: bool = True,
        include_tables: bool = True,
    ):
        """Get DAG for a specific table including upstream and downstream dependencies"""

        uow = self.uow
        try:
            dag_data = uow.tables.get_table_dag(
                table_name=full_name,
                max_depth=depth,
                direction=direction,
                include_jobs=include_jobs,
                include_tables=include_tables,
            )
            if not dag_data:
                return {
                    "status": "error",
                    "message": f"Table '{full_name}' not found",
                    "table_name": full_name,
                }

            # Return the DAG data directly following the specified structure
            return {
                "status": "success",
                "table_name": full_name,
                "graph": dag_data,
            }
        except Exception as e:
            logger.error(f"Error getting table DAG for {full_name}: {e}")
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "message": f"Failed to get table DAG: {str(e)}",
                "table_name": full_name,
            }

    def _ensure_node_entry(self, nodes: dict, node_type: str, obj) -> str:
        """Ensure node dict entry exists. Returns canonical node key id string."""
        if node_type == "job":
            key = f"j{obj.id}"
            if key not in nodes:
                nodes[key] = {
                    "id": key,
                    "type": "job",
                    "label": getattr(obj, "display_name", obj.job_id),
                    "job_id": obj.job_id,
                }
            return key
        else:
            key = f"t{obj.id}"
            if key not in nodes:
                nodes[key] = {
                    "id": key,
                    "type": "table",
                    "label": obj.table_name or obj.full_name,
                    "full_name": obj.full_name,
                }
            return key

    def get_job_neighbors(
        self,
        job_id: str,
        level: int = 1,
        direction: str = "both",
        limit: int | None = None,
    ):
        """Get neighbors around a job up to N hops (bidirectional over table/job edges)."""
        uow = self.uow
        job = uow.jobs.get(job_id)
        if not job:
            return {"status": "error", "message": f"Job '{job_id}' not found"}

        from sqlalchemy import and_, or_, select

        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        # BFS frontier of tuples (type, db_id)
        visited = set([("job", job.id)])
        frontier = [("job", job.id)]

        # always include the base job node
        self._ensure_node_entry(nodes, "job", job)

        added = 0
        for _ in range(max(1, level)):
            next_frontier = []
            for ntype, nid in frontier:
                if ntype == "job":
                    # Job -> Tables (output) only for downstream/both
                    if direction in ("downstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(
                            nid, "output"
                        ):
                            tkey = self._ensure_node_entry(nodes, "table", tbl)
                            jkey = f"j{nid}"
                            e = {"source": jkey, "target": tkey, "io": "output"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_job": job_id,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))

                    # Tables -> Job (inputs) only for upstream/both
                    if direction in ("upstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(
                            nid, "input"
                        ):
                            tkey = self._ensure_node_entry(nodes, "table", tbl)
                            jkey = f"j{nid}"
                            e = {"source": tkey, "target": jkey, "io": "input"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_job": job_id,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))

                    # Note: skip job↔job dependency edges in neighbors output

                else:  # table node
                    # Producers (job -> table) are upstream
                    if direction in ("upstream", "both"):
                        for prod in uow.job_table_links.get_jobs_by_table_and_io_type(
                            nid, "output"
                        ):
                            self._ensure_node_entry(nodes, "job", prod)
                            e = {
                                "source": f"j{prod.id}",
                                "target": f"t{nid}",
                                "io": "output",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_job": job_id,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("job", prod.id) not in visited:
                                visited.add(("job", prod.id))
                                next_frontier.append(("job", prod.id))

                    # Consumers (table -> job) are downstream
                    if direction in ("downstream", "both"):
                        for cons in uow.job_table_links.get_jobs_by_table_and_io_type(
                            nid, "input"
                        ):
                            self._ensure_node_entry(nodes, "job", cons)
                            e = {
                                "source": f"t{nid}",
                                "target": f"j{cons.id}",
                                "io": "input",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_job": job_id,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("job", cons.id) not in visited:
                                visited.add(("job", cons.id))
                                next_frontier.append(("job", cons.id))

            frontier = next_frontier

        return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}

    def get_table_neighbors(
        self,
        table_name: str,
        level: int = 1,
        direction: str = "both",
        limit: int | None = None,
    ):
        """Get neighbors around a table up to N hops (bidirectional over table/job edges)."""
        uow = self.uow
        table = uow.tables.get_by_full_name(table_name)
        if not table:
            return {"status": "error", "message": f"Table '{table_name}' not found"}

        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        visited = set([("table", table.id)])
        frontier = [("table", table.id)]
        self._ensure_node_entry(nodes, "table", table)

        added = 0
        for _ in range(max(1, level)):
            next_frontier = []
            for ntype, nid in frontier:
                if ntype == "table":
                    # Producers (job -> table) are upstream
                    if direction in ("upstream", "both"):
                        for prod in uow.job_table_links.get_jobs_by_table_and_io_type(
                            nid, "output"
                        ):
                            self._ensure_node_entry(nodes, "job", prod)
                            e = {
                                "source": f"j{prod.id}",
                                "target": f"t{nid}",
                                "io": "output",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_table": table_name,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("job", prod.id) not in visited:
                                visited.add(("job", prod.id))
                                next_frontier.append(("job", prod.id))

                    # Consumers (table -> job) are downstream
                    if direction in ("downstream", "both"):
                        for cons in uow.job_table_links.get_jobs_by_table_and_io_type(
                            nid, "input"
                        ):
                            self._ensure_node_entry(nodes, "job", cons)
                            e = {
                                "source": f"t{nid}",
                                "target": f"j{cons.id}",
                                "io": "input",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_table": table_name,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("job", cons.id) not in visited:
                                visited.add(("job", cons.id))
                                next_frontier.append(("job", cons.id))
                else:
                    # From job, hop to its output tables (downstream)
                    if direction in ("downstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(
                            nid, "output"
                        ):
                            self._ensure_node_entry(nodes, "table", tbl)
                            e = {
                                "source": f"j{nid}",
                                "target": f"t{tbl.id}",
                                "io": "output",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_table": table_name,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))
                    # From job, hop to its input tables (upstream)
                    if direction in ("upstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(
                            nid, "input"
                        ):
                            self._ensure_node_entry(nodes, "table", tbl)
                            e = {
                                "source": f"t{tbl.id}",
                                "target": f"j{nid}",
                                "io": "input",
                            }
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {
                                    "base_table": table_name,
                                    "nodes": list(nodes.values()),
                                    "edges": edges,
                                }
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))

            frontier = next_frontier

        return {"base_table": table_name, "nodes": list(nodes.values()), "edges": edges}

    def get_table_impact(
        self, base_table: str, max_depth: int = 3, include_jobs: bool = True
    ):
        """
        Compute downstream impact for a table up to max_depth.

        For each depth, return downstream tables and the writer jobs producing them.
        """
        uow = self.uow
        try:
            # Resolve base table
            table = uow.tables.get_by_full_name(base_table)
            if not table:
                return {
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

            visited_tables = {table.id}
            queue = [(table.id, table.full_name, 0)]
            items = []
            max_seen_depth = 0

            while queue:
                current_id, current_name, depth = queue.pop(0)
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
            result = {
                "base_table": base_table,
                "downstream": items,
                "summary": {
                    "total_depth": max_seen_depth,
                    "total_downstream_tables": len(items),
                    "total_writer_jobs": total_writer_jobs,
                },
            }
            return result
        except Exception as e:
            logger.error(f"Failed to compute impact for table {base_table}: {e}")
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "message": f"Failed to compute table impact: {str(e)}",
                "base_table": base_table,
                "downstream": [],
                "summary": {
                    "total_depth": 0,
                    "total_downstream_tables": 0,
                    "total_writer_jobs": 0,
                },
            }

    def get_table_triggers(self, table_name: str):
        """Return jobs that consume the table with trigger ON/OFF per job.

        Trigger state is sourced from graph_edge.is_trigger_on on the table->job edge.
        """
        uow = self.uow
        try:
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

            return {
                "status": "success",
                "table": table_name,
                "count": len(items),
                "jobs": items,
            }
        except Exception as e:
            logger.error(f"Failed to get trigger settings for table {table_name}: {e}")
            logger.exception("Full traceback:")
            return {"status": "error", "message": str(e)}

    def get_table_lineage_summary(
        self,
        table_name: str,
        max_roots: int = 50,
        max_leaves: int = 50,
        max_preview_paths: int = 4,
        max_full_paths: int = 25,
    ):
        """Aggregate upstream/downstream lineage metrics for a table."""
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

            response = {
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
            return response
        except Exception as exc:
            logger.error("Failed to compute lineage summary for %s: %s", table_name, exc)
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "error_code": "INTERNAL_ERROR",
                "message": str(exc),
            }

    def set_table_trigger(self, table_name: str, job_id: str, trigger: bool):
        """Set trigger ON/OFF for a specific job consuming a given table.

        - Updates job.trigger_tables JSON list
        - Updates graph_edge.is_trigger_on for the table->job input edge
        """
        uow = self.uow
        logger.info(f"set_table_trigger {job_id}/{table_name}: trigger: {trigger} ")
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}
            job = uow.jobs.get(job_id)
            if not job:
                return {"status": "error", "message": f"Job '{job_id}' not found"}

            trig_list = list(job.trigger_tables or [])
            prev = table_name in trig_list
            if trigger and not prev:
                trig_list.append(table_name)
            elif not trigger and prev:
                trig_list = [t for t in trig_list if t != table_name]
            job.trigger_tables = trig_list

            # Update edge flag for readability/status
            try:
                uow.edges.set_input_trigger(job.id, table.id, trigger)
            except Exception:
                pass

            # Persist change
            try:
                uow.commit()
            except Exception:
                uow.rollback()
                raise

            # Invalidate cache for this table's triggers
            try:
                from lineage_manager.core.config import get_settings

                settings = get_settings()
                if settings.redis.enabled:
                    import redis

                    r = redis.Redis(
                        host=settings.redis.host,
                        port=settings.redis.port,
                        db=settings.redis.db,
                        decode_responses=True,
                    )
                    cache_key = f"triggers:{table_name}"
                    r.delete(cache_key)
            except Exception:
                # Cache invalidation failure shouldn't break the main functionality
                pass

            return {
                "status": "success",
                "job_id": job_id,
                "table_name": table_name,
                "previous_state": bool(prev),
                "new_state": bool(trigger),
            }
        except Exception as e:
            logger.error(f"Failed to set trigger for {job_id}/{table_name}: {e}")
            logger.exception("Full traceback:")
            return {"status": "error", "message": str(e)}

    def bulk_set_table_triggers(self, table_name: str, trigger: bool):
        """Set trigger ON/OFF for all jobs that consume the table.

        Returns a summary with lists of affected job_ids.
        """
        uow = self.uow
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}

            jobs = uow.job_table_links.get_jobs_by_table_and_io_type(table.id, "input")
            changed, unchanged = [], []
            for j in jobs:
                trig_list = list(j.trigger_tables or [])
                has = table_name in trig_list
                if trigger and not has:
                    trig_list.append(table_name)
                    j.trigger_tables = trig_list
                    changed.append(j.job_id)
                elif not trigger and has:
                    j.trigger_tables = [t for t in trig_list if t != table_name]
                    changed.append(j.job_id)
                else:
                    unchanged.append(j.job_id)
                # Edge flag best-effort
                try:
                    uow.edges.set_input_trigger(j.id, table.id, trigger)
                except Exception:
                    pass

            # Persist changes
            try:
                uow.commit()
            except Exception:
                uow.rollback()
                raise

            # Invalidate cache for this table's triggers
            try:
                from lineage_manager.core.config import get_settings

                settings = get_settings()
                if settings.redis.enabled:
                    import redis

                    r = redis.Redis(
                        host=settings.redis.host,
                        port=settings.redis.port,
                        db=settings.redis.db,
                        decode_responses=True,
                    )
                    cache_key = f"triggers:{table_name}"
                    r.delete(cache_key)
            except Exception:
                # Cache invalidation failure shouldn't break the main functionality
                pass

            return {
                "status": "success",
                "table_name": table_name,
                "trigger": bool(trigger),
                "changed": changed,
                "unchanged": unchanged,
                "count": len(changed),
                "total": len(jobs),
            }
        except Exception as e:
            logger.error(f"bulk_set_table_triggers failed for {table_name}: {e}")
            logger.exception("Full traceback:")
            return {"status": "error", "message": str(e)}

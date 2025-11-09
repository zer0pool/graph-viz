import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from graph_manager.adapters.job_manager_adapter import (
    JobDataTransformer,
    JobManagerAdapter,
    JobManagerPort,
)
from graph_manager.api.v1.schemas import JobRegister
from graph_manager.core.uow import GraphUnitOfWork

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self, uow: GraphUnitOfWork, job_manager: JobManagerAdapter):
        self.uow = uow
        self.job_manager = job_manager

    def register_job(self, job_data: JobRegister) -> str:
        """
        Register a new job in the system using Unit of Work pattern.

        - FastAPI가 request마다 session을 state에 저장
        - GraphContainer가 session을 기반으로 uow를 만든 뒤
        - GraphService에서 동일 세션을 사용
        """
        logger.info(f"Starting job registration for job_id: {job_data.job_id}")
        logger.debug(f"Job data: {job_data.model_dump()}")

        uow = self.uow  # 요청 단위로 주입된 세션/트랜잭션
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
                uow.closures.add_direct(up, job.id, "job", "job")
                uow.closures.expand_closure(up, job.id, "job", "job")

            logger.info(
                f"Job registration completed successfully for job_id: {job.name}"
            )
            return job.id

        except Exception as e:
            logger.error(
                f"Error during job registration for job_id {job_data.job_id}: {e}"
            )
            logger.exception("Full traceback:")
            raise

    async def initialize_graph(self) -> Dict[str, Any]:
        """
        Initialize graph by fetching all jobs from Job Manager API
        and creating graph nodes, edges, and closure entries based on job dependencies.
        Uses the existing register_job method for consistency.
        """
        try:
            logger.info("Starting graph initialization")

            # Clear existing graph data
            # logger.info("Clearing existing graph data")
            # self.reset_graph()

            # Fetch all jobs from Job Manager API
            logger.info("Fetching all jobs from Job Manager API")
            logger.debug(
                f"Job Manager base URL: {getattr(self.job_manager, 'base_url', 'unknown')}"
            )

            try:
                jobs_data = await self.job_manager.get_all_jobs()
                logger.info(f"Successfully fetched {len(jobs_data)} jobs from API")

                if not jobs_data:
                    logger.warning("No jobs returned from Job Manager API")
                    logger.debug("This could indicate:")
                    logger.debug("1. API endpoint is not responding")
                    logger.debug("2. No jobs exist in the system")
                    logger.debug("3. Authentication/authorization issues")
                    logger.debug("4. Network connectivity problems")
                else:
                    logger.debug(
                        f"Sample job data: {jobs_data[0] if jobs_data else 'None'}"
                    )

            except Exception as api_error:
                logger.error(f"Failed to fetch jobs from Job Manager API: {api_error}")
                logger.exception("API call exception details:")
                raise

            # Process each job using the existing register_job method
            successful_registrations = 0
            failed_registrations = 0

            for job_data in jobs_data:
                try:
                    # Build destination_table from destinations response
                    destination_table = None
                    destinations = job_data.get("destinations", [])
                    if destinations:
                        dest = destinations[0]
                        dest_type = dest.get("type", "")
                        path = dest.get("path", "")
                        table_name = dest.get("table_name", "")

                        if path and table_name:
                            if dest_type == "mart":
                                destination_table = f"{path}.{table_name}"
                            elif dest_type == "external":
                                destination_table = f"{path}/{table_name}"
                            else:
                                destination_table = f"{path}.{table_name}"

                    # Transform job data to JobRegister schema
                    job_register = JobRegister(
                        job_id=job_data.get("job_id", ""),
                        name=job_data.get("name", job_data.get("job_id", "")),
                        labels=job_data.get("labels", {}),
                        owner=job_data.get("owner"),
                        write_mode=job_data.get("write_mode"),
                        destination_type=job_data.get("destination_type"),
                        destination_table=destination_table,
                        trigger_tables=job_data.get("trigger_tables", []),
                        reference_tables=job_data.get("reference_tables", []),
                        run_status=job_data.get("run_status", "RUN"),
                        schedule=job_data.get("schedule"),
                        destinations=job_data.get("destinations"),
                        metadata=job_data.get("metadata", {}),
                    )

                    # Register the job using the existing method
                    job_id = self.register_job(job_register)
                    logger.debug(f"Successfully registered job: {job_id}")
                    successful_registrations += 1

                except Exception as e:
                    logger.error(
                        f"Failed to register job {job_data.get('job_id', 'unknown')}: {e}"
                    )
                    failed_registrations += 1
                    continue

            # Get final statistics
            stats = self.get_health_stats()

            result = {
                "status": "success",
                "message": "Graph initialized successfully",
                "jobs_fetched": len(jobs_data),
                "successful_registrations": successful_registrations,
                "failed_registrations": failed_registrations,
                "database_stats": (
                    stats.get("database", {})
                    if stats.get("status") == "healthy"
                    else {}
                ),
            }

            logger.info(
                f"Graph initialization completed: {successful_registrations} successful, {failed_registrations} failed"
            )
            return result

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

    def reset_graph(self):
        """모든 그래프 관련 테이블 데이터를 삭제"""
        uow = self.uow
        try:
            logger.info("Starting graph reset - clearing all graph data")
            # 순서 중요: closure → edge → job_table_link → job → table
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
                nodes[key] = {"id": key, "type": "job", "label": obj.name or obj.job_id}
            return key
        else:
            key = f"t{obj.id}"
            if key not in nodes:
                nodes[key] = {"id": key, "type": "table", "label": obj.full_name}
            return key

    def get_job_neighbors(self, job_id: str, level: int = 1, direction: str = "both", limit: int | None = None):
        """Get neighbors around a job up to N hops (bidirectional over table/job edges)."""
        uow = self.uow
        job = uow.jobs.get(job_id)
        if not job:
            return {"status": "error", "message": f"Job '{job_id}' not found"}

        from graph_manager.models import GraphEdge, GraphJobNode, GraphTableNode
        from sqlalchemy import select, or_, and_

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
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(nid, "output"):
                            tkey = self._ensure_node_entry(nodes, "table", tbl)
                            jkey = f"j{nid}"
                            e = {"source": jkey, "target": tkey, "io": "output"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))

                    # Tables -> Job (inputs) only for upstream/both
                    if direction in ("upstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(nid, "input"):
                            tkey = self._ensure_node_entry(nodes, "table", tbl)
                            jkey = f"j{nid}"
                            e = {"source": tkey, "target": jkey, "io": "input"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))

                    # Note: skip job↔job dependency edges in neighbors output

                else:  # table node
                    # Producers (job -> table) are upstream
                    if direction in ("upstream", "both"):
                        for prod in uow.job_table_links.get_jobs_by_table_and_io_type(nid, "output"):
                            self._ensure_node_entry(nodes, "job", prod)
                            e = {"source": f"j{prod.id}", "target": f"t{nid}", "io": "output"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}
                            if ("job", prod.id) not in visited:
                                visited.add(("job", prod.id))
                                next_frontier.append(("job", prod.id))

                    # Consumers (table -> job) are downstream
                    if direction in ("downstream", "both"):
                        for cons in uow.job_table_links.get_jobs_by_table_and_io_type(nid, "input"):
                            self._ensure_node_entry(nodes, "job", cons)
                            e = {"source": f"t{nid}", "target": f"j{cons.id}", "io": "input"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}
                            if ("job", cons.id) not in visited:
                                visited.add(("job", cons.id))
                                next_frontier.append(("job", cons.id))

            frontier = next_frontier

        return {"base_job": job_id, "nodes": list(nodes.values()), "edges": edges}

    def get_table_neighbors(self, table_name: str, level: int = 1, direction: str = "both", limit: int | None = None):
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
                        for prod in uow.job_table_links.get_jobs_by_table_and_io_type(nid, "output"):
                            self._ensure_node_entry(nodes, "job", prod)
                            e = {"source": f"j{prod.id}", "target": f"t{nid}", "io": "output"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_table": table_name, "nodes": list(nodes.values()), "edges": edges}
                            if ("job", prod.id) not in visited:
                                visited.add(("job", prod.id))
                                next_frontier.append(("job", prod.id))

                    # Consumers (table -> job) are downstream
                    if direction in ("downstream", "both"):
                        for cons in uow.job_table_links.get_jobs_by_table_and_io_type(nid, "input"):
                            self._ensure_node_entry(nodes, "job", cons)
                            e = {"source": f"t{nid}", "target": f"j{cons.id}", "io": "input"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_table": table_name, "nodes": list(nodes.values()), "edges": edges}
                            if ("job", cons.id) not in visited:
                                visited.add(("job", cons.id))
                                next_frontier.append(("job", cons.id))
                else:
                    # From job, hop to its output tables (downstream)
                    if direction in ("downstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(nid, "output"):
                            self._ensure_node_entry(nodes, "table", tbl)
                            e = {"source": f"j{nid}", "target": f"t{tbl.id}", "io": "output"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_table": table_name, "nodes": list(nodes.values()), "edges": edges}
                            if ("table", tbl.id) not in visited:
                                visited.add(("table", tbl.id))
                                next_frontier.append(("table", tbl.id))
                    # From job, hop to its input tables (upstream)
                    if direction in ("upstream", "both"):
                        for tbl in uow.job_table_links.get_tables_by_job_and_io_type(nid, "input"):
                            self._ensure_node_entry(nodes, "table", tbl)
                            e = {"source": f"t{tbl.id}", "target": f"j{nid}", "io": "input"}
                            if e not in edges:
                                edges.append(e)
                                added += 1
                            if limit and added >= limit:
                                return {"base_table": table_name, "nodes": list(nodes.values()), "edges": edges}
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
                    "summary": {"total_depth": 0, "total_downstream_tables": 0, "total_writer_jobs": 0},
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
                                "description": f"{base_table} → {ot.full_name} 영향 depth={next_depth}",
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
                "summary": {"total_depth": 0, "total_downstream_tables": 0, "total_writer_jobs": 0},
            }

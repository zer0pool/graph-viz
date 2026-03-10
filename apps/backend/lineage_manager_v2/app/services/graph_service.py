import logging
from collections import deque
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.api.v1.schemas.lineage import GraphResponse, LineageRegistration
from app.domain.graph.entities.job_node import JobNode as Job
from app.domain.metadata.entities.resource import ResourceMetadata
from app.domain.project.entities import Project
from app.domain.user.entities import User
from app.infrastructure.external.job_manager_client import JobManagerClient
from app.infrastructure.models import GraphEdge, GraphNode
from app.infrastructure.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self, uow: UnitOfWork, job_manager_client: JobManagerClient):
        self.uow = uow
        self.job_manager_client = job_manager_client

    async def register_lineage(self, data: LineageRegistration) -> str:
        async with self.uow:
            for edge in data.edges:
                source_id = await self.uow.graph.ensure_node(
                    edge.source_type, edge.source_name
                )
                target_id = await self.uow.graph.ensure_node(
                    edge.target_type, edge.target_name
                )
                await self.uow.graph.add_edge(
                    source_id, target_id, edge.edge_type, edge.properties
                )

            await self.uow.graph.sync_closure_table()
            await self.uow.commit()

        return f"Registered {len(data.edges)} edges and synced closure table"

    async def initialize_graph(
        self, 
        drop_existing: bool = False, 
        batch_size: int = 100,
        audit_service: Optional[Any] = None,
        audit_parent_id: Optional[int] = None,
        user_email: str = "system"
    ) -> Dict[str, Any]:
        """
        Automated Discovery & Initialization:
        1. Fetch all jobs from external Job Manager
        2. Create/Update Projects and Jobs in our DB (in batches)
        3. Register nodes and edges in lineage graph (in batches)
        4. Sync closure table after each batch
        """
        if drop_existing:
            async with self.uow:
                await self.uow.graph.clear_graph_data()
                await self.uow.commit()

        # 1. Discovery from external source
        import time
        start_time = time.time()
        
        # Audit: Start Detail
        if audit_service and audit_parent_id:
            await audit_service.bulk_create_details(
                parent_id=audit_parent_id,
                action_type="GRAPH_INIT_EVENT",
                user_email=user_email,
                targets=["Graph Initialization Start"],
                target_type="SYSTEM",
                status="SUCCESS"
            )

        external_jobs = await self.job_manager_client.fetch_scheduling_lineage()
        total_jobs = len(external_jobs)
        logger.info(f"Fetched {total_jobs} jobs from external source")

        overall_stats: Dict[str, Any] = {"jobs": 0, "edges": 0, "projects": set(), "failed": 0}

        # 2. Process in batches
        for i in range(0, total_jobs, batch_size):
            batch = external_jobs[i : i + batch_size]
            logger.info(f"Processing batch {i // batch_size + 1} ({len(batch)} jobs)")

            async with self.uow:
                for item in batch:
                    job_id = item.get("job_id")
                    
                    try:
                        metadata = item.get("metadata", {})
                        job_meta = metadata.get("job_meta", {})
                        project_id = (
                            metadata.get("project_name")
                            or metadata.get("project")
                            or "unknown"
                        )

                        # 2.1 Ensure Project
                        if project_id not in overall_stats["projects"]:
                            p_entity = Project(
                                project_id=project_id,
                                display_name=project_id.replace("-", " ").title(),
                            )
                            await self.uow.projects.save(p_entity)
                            overall_stats["projects"].add(project_id)

                        # 2.2 Save Job Metadata
                        job_entity = Job(
                            job_id=job_id,
                            project_id=project_id,
                            name=metadata.get("name", str(job_id).split(".")[-1]),
                            owners=metadata.get("owner", []),
                            properties=job_meta,
                        )
                        await self.uow.jobs.save(job_entity)
                        overall_stats["jobs"] += 1

                        # 2.3 Register Lineage Nodes & Edges
                        job_node_id = await self.uow.graph.ensure_node("job", job_id)

                        # Upstreams
                        for up in item.get("upstreams", []):
                            u_type = up.get("type", "table")
                            u_name = up.get("name")
                            if u_type in ("table", "storage"):
                                t_entity = ResourceMetadata(
                                    id=0,
                                    project_id=project_id,
                                    fqn=u_name,
                                    data_type=u_type.upper(),
                                )
                                saved_table = await self.uow.data_nodes.save(t_entity)
                                u_node_id = saved_table.id
                            else:
                                u_node_id = await self.uow.graph.ensure_node(u_type, u_name)

                            await self.uow.graph.add_edge(
                                u_node_id,
                                job_node_id,
                                "consumes",
                                {"trigger": up.get("trigger", False)},
                            )
                            overall_stats["edges"] += 1

                        # Downstreams
                        for down in item.get("downstreams", []):
                            d_type = down.get("type", "table")
                            d_name = down.get("name")
                            if d_type in ("table", "storage"):
                                t_entity = ResourceMetadata(
                                    id=0,
                                    project_id=project_id,
                                    fqn=d_name,
                                    data_type=d_type.upper(),
                                )
                                saved_table = await self.uow.data_nodes.save(t_entity)
                                d_node_id = saved_table.id
                            else:
                                d_node_id = await self.uow.graph.ensure_node(d_type, d_name)

                            await self.uow.graph.add_edge(
                                job_node_id,
                                d_node_id,
                                "produces",
                                {"write_mode": down.get("write_mode")},
                            )
                            overall_stats["edges"] += 1

                    except Exception as e:
                        logger.error(f"Failed to process job {job_id}: {e}")
                        overall_stats["failed"] += 1

                # 3. Finalize Batch
                await self.uow.graph.sync_closure_table()
                await self.uow.commit()
                logger.debug(f"Batch {i // batch_size + 1} committed")

        # Audit: End Detail
        total_duration = time.time() - start_time
        if audit_service and audit_parent_id:
            await audit_service.bulk_create_details(
                parent_id=audit_parent_id,
                action_type="GRAPH_INIT_EVENT",
                user_email=user_email,
                targets=["Graph Initialization Complete"],
                target_type="SYSTEM",
                status="SUCCESS"
            )

        projects_set = overall_stats.get("projects", set())
        if isinstance(projects_set, set):
            overall_stats["projects"] = list(projects_set)
        return {"status": "success", "stats": overall_stats, "duration": total_duration}

    async def get_table_lineage(
        self, fqn: str, depth: int, direction: str
    ) -> Dict[str, Any]:
        async with self.uow:
            # Try 'table' first, then 'storage'
            node_id = await self.uow.graph.get_node_id("table", fqn)
            if not node_id:
                node_id = await self.uow.graph.get_node_id("storage", fqn)

            if not node_id:
                return {"nodes": [], "edges": []}

            return await self.uow.graph.get_lineage_graph(node_id, depth, direction)

    async def get_job_lineage(
        self, job_id: str, depth: int, direction: str
    ) -> Dict[str, Any]:
        async with self.uow:
            node_id = await self.uow.graph.get_node_id("job", job_id)
            if not node_id:
                return {"nodes": [], "edges": []}

            return await self.uow.graph.get_lineage_graph(node_id, depth, direction)

    async def get_lineage_graph(
        self, node_id: str, depth: int = 1, direction: str = "both"
    ) -> Dict[str, Any]:
        """
        Generic graph lookup that handles node_id in format 'type:name'.
        Designed for Mermaid/Cytoscape frontend compatibility.
        """
        # 1. Parse node_id
        if ":" not in node_id:
            node_type, node_name = "job", node_id
        else:
            node_type, node_name = node_id.split(":", 1)

        async with self.uow:
            # 2. Get numeric ID
            internal_id = await self.uow.graph.get_node_id(node_type, node_name)
            if not internal_id:
                return {
                    "nodes": [],
                    "edges": [],
                    "metadata": {"total_nodes": 0, "depth": depth, "truncated": False},
                }

            # 3. Fetch numeric graph
            graph = await self.uow.graph.get_lineage_graph(
                internal_id, depth, direction
            )

            # 4. Map numeric IDs back to prefixed string IDs for mfe-lineage
            id_map = {n["id"]: f"{n['type']}:{n['name']}" for n in graph["nodes"]}

            formatted_nodes = []
            for n in graph["nodes"]:
                formatted_nodes.append(
                    {
                        "id": id_map[n["id"]],
                        "type": n["type"],
                        "label": n["name"],
                        "properties": n["properties"],
                    }
                )

            formatted_edges = []
            for e in graph["edges"]:
                source_id = id_map.get(e["source"])
                target_id = id_map.get(e["target"])
                if source_id and target_id:
                    formatted_edges.append(
                        {
                            "id": e["id"],
                            "source": source_id,
                            "target": target_id,
                            "type": "reads" if e["type"] == "consumes" else "writes",
                            "properties": e["properties"],
                        }
                    )

            return {
                "nodes": formatted_nodes,
                "edges": formatted_edges,
                "metadata": {
                    "total_nodes": len(formatted_nodes),
                    "depth": depth,
                    "truncated": False,
                },
            }

    async def get_table_hierarchy(
        self, table_name: str, max_depth: int = 20
    ) -> Dict[str, Any]:
        """
        BFS traversal for vertical lineage hierarchy (List View).
        """
        async with self.uow:
            center_id = await self.uow.graph.get_node_id("table", table_name)
            if not center_id:
                center_id = await self.uow.graph.get_node_id("storage", table_name)

            if not center_id:
                return {"status": "error", "message": f"Table {table_name} not found"}

            # BFS traversal for upstream and downstream hierarchy (delegated to repository)
            upstream = await self.uow.graph.get_table_hierarchy_bfs(
                center_id, table_name, "upstream", max_depth
            )
            downstream = await self.uow.graph.get_table_hierarchy_bfs(
                center_id, table_name, "downstream", max_depth
            )

            center_node = {
                "id": table_name,
                "name": table_name,
                "type": "table",
                "depth": 0,
                "parent": None,
            }

            return {
                "status": "success",
                "upstream": [center_node] + upstream,
                "downstream": [center_node] + downstream,
                "root_nodes": [n["id"] for n in upstream if n["depth"] == max_depth],
                "leaf_nodes": [n["id"] for n in downstream if n["depth"] == max_depth],
            }

    async def get_nodes_batch_details(self, node_ids: List[str]) -> Dict[str, Any]:
        """
        Bulk metadata retrieval for a list of node identifiers.
        """
        results = {}
        async with self.uow:
            for lid in node_ids:
                ntype, nname = lid.split(":", 1) if ":" in lid else ("job", lid)

                node_id = await self.uow.graph.get_node_id(ntype, nname)

                table_info: Dict[str, Any] = {
                    "id": lid,
                    "type": ntype,
                    "write_mode": "-",
                    "storage_type": "-",
                }
                job_info: Dict[str, Any] = {
                    "job_id": "-",
                    "owners": [],
                    "status": "not_found",
                    "run_status": "-",
                    "type": None,
                }

                if node_id:
                    if ntype == "job":
                        job_node = await self.uow.jobs.get_by_id(node_id)
                        if job_node:
                            job_info = {
                                "job_id": job_node.job_id,
                                "owners": job_node.owners,
                                "status": "active",
                                "run_status": "success",
                                "type": "batch",
                            }
                    elif ntype == "table":
                        # Find producer job for this table (delegated to repository)
                        prod_job_id = await self.uow.graph.get_producing_job_id(node_id)
                        if prod_job_id:
                            prod_job = await self.uow.jobs.get_by_id(prod_job_id)
                            if prod_job:
                                job_info = {
                                    "job_id": prod_job.job_id,
                                    "owners": prod_job.owners,
                                    "status": "active",
                                    "run_status": "success",
                                    "type": "batch",
                                }

                results[lid] = {"table_info": table_info, "job_info": job_info}

        return {"status": "success", "results": results}

    async def diagnose(self) -> Dict[str, Any]:
        async with self.uow:
            return {
                "projects": await self.uow.projects.count(),
                "jobs": await self.uow.jobs.count(),
                "users": await self.uow.users.count(),
                "tables": await self.uow.data_nodes.count(),
                "graph": await self.uow.graph.get_stats(),
            }

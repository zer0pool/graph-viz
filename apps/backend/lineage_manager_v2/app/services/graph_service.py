from collections import deque
from typing import Any, Dict, List

from sqlalchemy import select

from app.api.v1.schemas.lineage import GraphResponse, LineageRegistration
from app.domain.graph.entities.job_node import JobNode as Job
from app.domain.metadata.entities.resource import ResourceMetadata
from app.domain.project.entities import Project
from app.domain.user.entities import User
from app.infrastructure.external.job_manager_client import JobManagerClient
from app.infrastructure.models import GraphEdge, GraphNode
from app.infrastructure.unit_of_work import UnitOfWork

import logging

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

    async def initialize_graph(self, drop_existing: bool = False) -> str:
        """
        Automated Discovery & Initialization:
        1. Fetch all jobs from external Job Manager
        2. Create/Update Projects and Jobs in our DB
        3. Register nodes and edges in lineage graph
        4. Sync closure table
        """
        async with self.uow:
            if drop_existing:
                await self.uow.graph.clear_graph_data()

            # 1. Discovery from external source
            external_jobs = await self.job_manager_client.fetch_scheduling_lineage()
            
            logger.info(f"Fetched {len(external_jobs)} jobs from external source")
            
            stats = {"jobs": 0, "edges": 0, "projects": set()}

            for item in external_jobs:
                job_id = item.get("job_id")
                metadata = item.get("metadata", {})
                job_meta = metadata.get("job_meta", {})
                project_id = (
                    metadata.get("project_name") or metadata.get("project") or "unknown"
                )

                # 1.1 Ensure Project
                if project_id not in stats["projects"]:
                    p_entity = Project(
                        project_id=project_id,
                        display_name=project_id.replace("-", " ").title(),
                    )
                    await self.uow.projects.save(p_entity)
                    stats["projects"].add(project_id)

                # 1.2 Save Job Metadata
                job_entity = Job(
                    job_id=job_id,
                    project_id=project_id,
                    name=metadata.get("name", job_id.split(".")[-1]),
                    owners=metadata.get("owner", []),
                    properties=job_meta,
                )
                await self.uow.jobs.save(job_entity)
                stats["jobs"] += 1

                # 1.2.1 Sync Owners (Users)
                for owner_id in job_entity.owners:
                    # In V2, we ensure the user exists in the user_account table
                    existing_user = await self.uow.users.get_by_user_id(owner_id)
                    if not existing_user:
                        new_user = User(
                            user_id=owner_id,
                            sub=owner_id,  # Fallback: use user_id as sub if unknown
                            login_id=owner_id,
                            name=owner_id,
                        )
                        await self.uow.users.save(new_user)

                # 1.3 Register Lineage Nodes & Edges
                job_node_id = await self.uow.graph.ensure_node("job", job_id)

                # Upstreams
                for up in item.get("upstreams", []):
                    u_type = up.get("type", "table")
                    u_name = up.get("name")

                    # If it's a data node (table/storage), ensure DataNode exists
                    if u_type in ("table", "storage"):
                        t_entity = ResourceMetadata(
                            id=0,  # placeholder, repository will handle
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
                    stats["edges"] += 1

                # Downstreams
                for down in item.get("downstreams", []):
                    d_type = down.get("type", "table")
                    d_name = down.get("name")

                    # If it's a data node (table/storage), ensure DataNode exists
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
                    stats["edges"] += 1

            # 2. Finalize
            await self.uow.graph.sync_closure_table()
            await self.uow.commit()

        return f"Discovery complete: {stats['jobs']} jobs, {stats['edges']} edges, {len(stats['projects'])} projects created/updated"

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
                return {"nodes": [], "edges": [], "metadata": {"total_nodes": 0, "depth": depth, "truncated": False}}

            # 3. Fetch numeric graph
            graph = await self.uow.graph.get_lineage_graph(internal_id, depth, direction)

            # 4. Map numeric IDs back to prefixed string IDs for mfe-lineage
            id_map = {n["id"]: f"{n['type']}:{n['name']}" for n in graph["nodes"]}
            
            formatted_nodes = []
            for n in graph["nodes"]:
                formatted_nodes.append({
                    "id": id_map[n["id"]],
                    "type": n["type"],
                    "label": n["name"],
                    "properties": n["properties"]
                })
            
            formatted_edges = []
            for e in graph["edges"]:
                source_id = id_map.get(e["source"])
                target_id = id_map.get(e["target"])
                if source_id and target_id:
                    formatted_edges.append({
                        "id": e["id"],
                        "source": source_id,
                        "target": target_id,
                        "type": "reads" if e["type"] == "consumes" else "writes",
                        "properties": e["properties"]
                    })

            return {
                "nodes": formatted_nodes,
                "edges": formatted_edges,
                "metadata": {
                    "total_nodes": len(formatted_nodes),
                    "depth": depth,
                    "truncated": False
                }
            }

    async def get_table_hierarchy(self, table_name: str, max_depth: int = 20) -> Dict[str, Any]:
        """
        BFS traversal for vertical lineage hierarchy (List View).
        """
        async with self.uow:
            center_id = await self.uow.graph.get_node_id("table", table_name)
            if not center_id:
                center_id = await self.uow.graph.get_node_id("storage", table_name)
                
            if not center_id:
                return {"status": "error", "message": f"Table {table_name} not found"}

            # BFS traversal for upstream and downstream hierarchy
            upstream = await self._bfs_hierarchy(center_id, table_name, "upstream", max_depth)
            downstream = await self._bfs_hierarchy(center_id, table_name, "downstream", max_depth)

            center_node = {
                "id": table_name,
                "name": table_name,
                "type": "table",
                "depth": 0,
                "parent": None
            }

            return {
                "status": "success",
                "upstream": [center_node] + upstream,
                "downstream": [center_node] + downstream,
                "root_nodes": [n["id"] for n in upstream if n["depth"] == max_depth],
                "leaf_nodes": [n["id"] for n in downstream if n["depth"] == max_depth],
            }

    async def _bfs_hierarchy(
        self, start_id: int, start_name: str, direction: str, max_depth: int
    ) -> List[Dict]:
        """
        BFS over graph edges to build the lineage hierarchy for the List View.
        Uses the already-open UoW graph repository — must be called inside an
        `async with self.uow` block.
        """
        items: List[Dict] = []
        visited = {start_id}
        queue = deque([(start_id, start_name, 0, None)])

        edge_table = GraphEdge
        node_table = GraphNode

        while queue:
            curr_id, curr_name, depth, parent_name = queue.popleft()
            if depth >= max_depth:
                continue

            if direction == "upstream":
                where = edge_table.target_node_id == curr_id
            else:
                where = edge_table.source_node_id == curr_id

            res = await self.uow.graph.db.execute(select(edge_table).where(where))
            for edge in res.scalars().all():
                neighbor_id = (
                    edge.source_node_id if direction == "upstream" else edge.target_node_id
                )
                if neighbor_id in visited:
                    continue
                visited.add(neighbor_id)

                n_res = await self.uow.graph.db.execute(
                    select(node_table).where(node_table.id == neighbor_id)
                )
                neighbor = n_res.scalar_one_or_none()
                if neighbor:
                    name = neighbor.name
                    items.append({
                        "id": name,
                        "name": name.split(".")[-1] if "." in name else name,
                        "type": neighbor.node_type,
                        "depth": depth + 1,
                        "parent": curr_name,
                    })
                    queue.append((neighbor_id, name, depth + 1, curr_name))
        return items

    async def get_nodes_batch_details(self, node_ids: List[str]) -> Dict[str, Any]:
        """
        Bulk metadata retrieval for a list of node identifiers.
        """
        results = {}
        async with self.uow:
            for lid in node_ids:
                if ":" not in lid:
                    ntype, nname = "job", lid
                else:
                    ntype, nname = lid.split(":", 1)
                
                # Fetch basic info
                node_id = await self.uow.graph.get_node_id(ntype, nname)
                
                table_info = {
                    "id": lid,
                    "type": ntype,
                    "write_mode": "-",
                    "storage_type": "-"
                }
                
                job_info = {
                    "job_id": "-",
                    "owners": [],
                    "status": "not_found",
                    "run_status": "-",
                    "type": None
                }

                if node_id:
                    # Fetch more metadata if it's a job
                    if ntype == "job":
                        job = await self.uow.jobs.get_by_id(node_id)
                        if job:
                            job_info = {
                                "job_id": job.job_id,
                                "owners": job.owners,
                                "status": "active",
                                "run_status": "success",
                                "type": "batch"
                            }
                    elif ntype == "table":
                        # Find producer job for this table
                        query = select(self.uow.graph.db.base.metadata.tables["graph_edge"]).where(
                            self.uow.graph.db.base.metadata.tables["graph_edge"].c.target_node_id == node_id,
                            self.uow.graph.db.base.metadata.tables["graph_edge"].c.edge_type == "produces"
                        )
                        res = await self.uow.graph.db.execute(query)
                        prod_edge = res.fetchone()
                        if prod_edge:
                            prod_job = await self.uow.jobs.get_by_id(prod_edge.source_node_id)
                            if prod_job:
                                job_info = {
                                    "job_id": prod_job.job_id,
                                    "owners": prod_job.owners,
                                    "status": "active",
                                    "run_status": "success",
                                    "type": "batch"
                                }
                
                results[lid] = {"table_info": table_info, "job_info": job_info}
        
        return {"status": "success", "results": results}

    async def diagnose(self) -> Dict[str, Any]:
        async with self.uow:
            p_count = await self.uow.projects.count()
            j_count = await self.uow.jobs.count()
            u_count = await self.uow.users.count()
            t_count = await self.uow.data_nodes.count()
            graph_stats = await self.uow.graph.get_stats()

            return {
                "projects": p_count,
                "jobs": j_count,
                "users": u_count,
                "tables": t_count,
                "graph": graph_stats,
            }

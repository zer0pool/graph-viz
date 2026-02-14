from typing import List, Dict, Any, Optional
from sqlalchemy import select
from app.infrastructure.unit_of_work import UnitOfWork
from app.api.v1.schemas.lineage import LineageRegistration, GraphResponse

from app.infrastructure.external.job_manager_client import JobManagerClient
from app.domain.project.entities import Project
from app.domain.user.entities import User
from app.domain.graph.entities.job_node import JobNode as Job
from app.domain.metadata.entities.resource import ResourceMetadata


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
                            id=0, # placeholder, repository will handle
                            project_id=project_id,
                            fqn=u_name,
                            data_type=u_type.upper()
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
                            data_type=d_type.upper()
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

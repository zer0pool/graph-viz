import strawberry
from typing import Optional
from strawberry.types import Info

from app.graphql.types import JobType, TableType, GraphStats
from app.graphql.context import Context
from app.domain.graph.service import GraphService

@strawberry.type
class Query:
    @strawberry.field
    async def job(self, id: strawberry.ID, info: Info[Context, None]) -> Optional[JobType]:
        session = info.context.session
        service = GraphService(session)
        
        # Determine if ID is int (DB ID) or string (Name/Job ID)
        # For simplicity, assuming ID passed here is the DB ID (int)
        # But if it's the Job ID (string), we need lookup.
        try:
            db_id = int(id)
            node = await service.repo.get_node_by_id(db_id)
        except ValueError:
            # Maybe look up by name if it's a string?
            node = await service.repo.get_node_by_name("JOB", str(id))
            
        if not node:
            return None
            
        return JobType(
            id=strawberry.ID(str(node.id)),
            name=node.name,
            node_type=node.node_type,
            owner_id="unknown", # Fetch from leaf table joined (TODO)
            project_id="unknown",
            schedule_interval=None,
            is_active=True,
            description=None
        )

    @strawberry.field
    async def table(self, name: str, info: Info[Context, None]) -> Optional[TableType]:
        session = info.context.session
        service = GraphService(session)
        
        node = await service.repo.get_node_by_name("TABLE", name)
        if not node:
            return None
            
        return TableType(
            id=strawberry.ID(str(node.id)),
            name=node.name,
            node_type=node.node_type,
            dataset_name=node.name.split('.')[1] if '.' in node.name else "default",
            table_name=node.name.split('.')[-1],
            location="US"
        )
    
    @strawberry.field
    async def stats(self, info: Info[Context, None]) -> GraphStats:
        # Mock stats for now
        return GraphStats(
            total_nodes=100,
            total_edges=500,
            jobs_count=20,
            tables_count=80
        )

schema = strawberry.Schema(query=Query)

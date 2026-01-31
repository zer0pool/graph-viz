import strawberry
from typing import List, Optional
from datetime import datetime

# --- Remote Types (Federated) ---

@strawberry.type
class JobRun:
    """ fetched from Job Manager API """
    run_id: str
    job_id: str
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_ms: Optional[float]

@strawberry.type
class TableHistory:
    """ fetched from BigQuery """
    date: str
    row_count: int
    size_bytes: int

# --- Domain Types ---

@strawberry.type
class JobType:
    id: strawberry.ID
    name: str # FQN
    node_type: str
    
    # Metadata (Heavy Leaf) -- mapped from DB model
    owner_id: Optional[str]
    project_id: Optional[str]
    schedule_interval: Optional[str]
    is_active: Optional[bool]
    description: Optional[str]
    
    # Federation Fields
    @strawberry.field
    async def runs(self, limit: int = 5) -> List[JobRun]:
        from app.graphql.resolvers import resolve_job_runs
        return await resolve_job_runs(self.name, limit) # self.name is job_id usually

@strawberry.type
class TableType:
    id: strawberry.ID
    name: str
    node_type: str
    
    dataset_name: str
    table_name: str
    location: Optional[str]
    
    # Federation Fields
    @strawberry.field
    async def history(self, days: int = 7) -> List[TableHistory]:
        from app.graphql.resolvers import resolve_table_history
        return await resolve_table_history(self.name, days)

@strawberry.type
class GraphStats:
    total_nodes: int
    total_edges: int
    jobs_count: int
    tables_count: int

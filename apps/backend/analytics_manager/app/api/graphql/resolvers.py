"""
GraphQL Query resolvers for Unified Landing Pages.
Standardized on Cloudflare Analytics API patterns.
"""
from typing import List, Optional, Dict, Any
import strawberry
from strawberry.types import Info
from dependency_injector.wiring import Provide, inject

from app.api.graphql.schema import (
    MetricGroups, 
    JobConnection, 
    JobFilter,
    JobEdge,
    PageInfo,
    Job,
    JobConfig,
    JobStats,
    Table,
    TableConfig,
    TableStats,
    TableConnection,
    TableEdge,
    TableFilter,
    User,
    Project
)
from app.core.container import Container
from app.domain.analytics.service import AnalyticsService
from app.domain.job_explorer.service import JobExplorerService

@strawberry.type
class Query:
    @strawberry.field(description="Retrieve a list of metrics by their IDs.")
    async def metrics(
        self, 
        info: Info, 
        ids: List[str]
    ) -> List[MetricGroups]:
        container = info.context["container"]
        analytics_service: AnalyticsService = await container.analytics_service()
        return await analytics_service.get_metrics_by_ids(ids)

    @strawberry.field(description="Search and list Jobs with performance stats.")
    async def jobs(
        self, 
        info: Info, 
        first: int = 20, 
        after: Optional[str] = None,
        filter: Optional[JobFilter] = None
    ) -> JobConnection:
        container = info.context["container"]
        job_service: JobExplorerService = await container.job_explorer_service()
        
        # In a real scenario, we would apply JobFilter here
        job_runs = await job_service.get_recent_job_runs()
        
        edges = []
        if not job_runs:
            # Fallback for mock/local testing if BigQuery fails
            job_runs = [
                {
                    "job_id": "job_mock_01",
                    "name": "Daily Sales Aggregation",
                    "project_id": "sales-prod",
                    "owners": ["data-team"],
                    "type": "SELF-TYPE",
                    "status": "SUCCESS",
                    "execution_time": "2026-02-24T10:00:00Z"
                }
            ]

        for i, r in enumerate(job_runs[:first]):
            node = Job(
                id=strawberry.ID(str(r["job_id"])),
                display_label=str(r["name"] or r["job_id"]),
                config=JobConfig(
                    owner=str(r["owners"][0] if r["owners"] else "N/A"),
                    schedule="0 * * * *", # Placeholder
                    project_id=str(r["project_id"]),
                    type=str(r.get("type"))
                ),
                stats=JobStats(
                    avg_slots=12.5,
                    max_slots=30,
                    total_duration_24h=3600,
                    last_run_status=str(r["status"]),
                    updated_at=str(r["execution_time"])
                )
            )
            edges.append(JobEdge(node=node, cursor=str(i)))
        
        return JobConnection(
            edges=edges,
            page_info=PageInfo(has_next_page=len(job_runs) > first, end_cursor=str(first-1)),
            total_count=len(job_runs)
        )

    @strawberry.field(description="Search and list Tables with metadata and update stats.")
    async def tables(
        self,
        info: Info,
        first: int = 20,
        after: Optional[str] = None,
        filter: Optional[TableFilter] = None
    ) -> TableConnection:
        # Mocking Table results for architectural demonstration
        mock_tables: List[Dict[str, Any]] = [
            {
                "id": "t1",
                "fqn": "project.dataset.table_analytics",
                "owners": ["data-eng-team"],
                "row_count": 1500000,
                "update_mode": "APPEND"
            }
        ]
        
        edges = [
            TableEdge(
                node=Table(
                    id=strawberry.ID(str(t["id"])),
                    fqn=str(t["fqn"]),
                    config=TableConfig(owners=list(t["owners"])),
                    stats=TableStats(
                        row_count=int(t["row_count"]),
                        update_mode=str(t["update_mode"]),
                        last_update_time="2026-02-24T12:00:00Z"
                    )
                ),
                cursor="0"
            ) for t in mock_tables
        ]
        
        return TableConnection(
            edges=edges,
            page_info=PageInfo(has_next_page=False, end_cursor="0"),
            total_count=len(mock_tables)
        )

    @strawberry.field(description="Get a single user by ID.")
    async def user(self, info: Info, id: strawberry.ID) -> Optional[User]:
        # Mocking for architectural demonstration
        return User(
            id=id,
            username="demo_user",
            full_name="Demo User",
            email="demo@example.com"
        )

    @strawberry.field(description="Get a single project by ID.")
    async def project(self, info: Info, id: strawberry.ID) -> Optional[Project]:
        # Mocking for architectural demonstration
        return Project(
            id=id,
            display_name="Demo Project",
            description="A demonstration project"
        )

    @strawberry.field(description="List all users (Placeholder).")
    async def users(self, info: Info) -> List[User]:
        return [
            User(id=strawberry.ID("u1"), username="admin", full_name="Administrator"),
            User(id=strawberry.ID("u2"), username="viewer", full_name="Data Viewer")
        ]

    @strawberry.field(description="List all projects (Placeholder).")
    async def projects(self, info: Info) -> List[Project]:
        return [
            Project(id=strawberry.ID("p1"), display_name="Sales Analytics"),
            Project(id=strawberry.ID("p2"), display_name="Platform Monitoring")
        ]

schema = strawberry.Schema(query=Query)

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
    OwnerCount,
    MonthCount,
    JobAggregation,
    Table,
    TableConfig,
    TableStats,
    TableConnection,
    TableEdge,
    TableFilter,
    User,
    Project,
    JobRun,
    JobRunFilter,
    JobRunFilterFacets,
    RecentJobRunsResponse,
    SortOrder
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
        
        # Simple filtering implementation for now (searchTerm + a few other fields)
        if filter:
            if filter.search_term:
                term = filter.search_term.lower()
                job_runs = [
                    r for r in job_runs
                    if term in str(r.get("job_id", "")).lower()
                    or term in str(r.get("name", "")).lower()
                ]
            if filter.project_id:
                pid = filter.project_id.lower()
                job_runs = [
                    r for r in job_runs
                    if pid in str(r.get("project_id", "")).lower()
                ]
            if filter.owner:
                own = filter.owner.lower()
                job_runs = [
                    r for r in job_runs
                    if own in " ".join(r.get("owners", [])).lower()
                ]
            if filter.status:
                st = filter.status.lower()
                job_runs = [
                    r for r in job_runs
                    if st in str(r.get("status", "")).lower()
                ]
        
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
                    "execution_time": "2026-02-24T10:00:00Z",
                    "duration": 320,
                    "progress": 0.8
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
                    updated_at=str(r["execution_time"]),
                    duration=int(r.get("duration", 0)),
                    progress=float(r.get("progress", 0.0))
                )
            )
            edges.append(JobEdge(node=node, cursor=str(i)))
        
        return JobConnection(
            edges=edges,
            page_info=PageInfo(has_next_page=len(job_runs) > first, end_cursor=str(first-1)),
            total_count=len(job_runs)
        )

    @strawberry.field(description="Retrieve a paginated list of the 100 most recent job runs with optional filtering.")
    async def recent_job_runs(
        self,
        info: Info,
        offset: int = 0,
        limit: int = 10,
        refresh: bool = False,
        sort_by: Optional[strawberry.ID] = None,
        sort_order: SortOrder = SortOrder.DESC,
        filter: Optional[JobRunFilter] = None
    ) -> RecentJobRunsResponse:
        container = info.context["container"]
        job_service: JobExplorerService = await container.job_explorer_service()
        # Still fetch up to 100 to populate the cache/context
        job_runs = await job_service.get_recent_job_runs(limit=100, refresh=refresh)
        
        # 1. Calculate Facets from the full list (100 runs) before filtering
        # This allows the UI to show all possible selectable values regardless of current filters
        all_owners = set()
        all_projects = set()
        all_types = set()
        all_issuers = set()
        all_statuses = set()
        
        for r in job_runs:
            for o in r.get("owners", []):
                if o: all_owners.add(str(o))
            if r.get("project_id"): all_projects.add(str(r["project_id"]))
            if r.get("type"): all_types.add(str(r["type"]))
            if r.get("issuer"): all_issuers.add(str(r["issuer"]))
            # Use the requested statuses from screenshot for better demonstration
            status_options = ["Completed", "Error", "Active", "Queued"]
            status = r.get("status")
            if not status:
                # Deterministic pseudo-random status based on jobId and startTime
                seed = len(str(r.get("job_id", ""))) + int(r.get("start_time", "0")[-2:] or "0")
                status = status_options[seed % len(status_options)]
            
            all_statuses.add(status)
            r["status"] = status # Ensure it's stored back for items mapping
            
        facets = JobRunFilterFacets(
            owners=sorted(list(all_owners)),
            projects=sorted(list(all_projects)),
            types=sorted(list(all_types)),
            issuers=sorted(list(all_issuers)),
            statuses=sorted(list(all_statuses))
        )

        # 2. Apply Filtering
        filtered_runs = job_runs
        if filter:
            # ... (filtering logic same as before)
            if filter.job_id:
                val = filter.job_id.lower()
                filtered_runs = [r for r in filtered_runs if val in str(r.get("job_id", "")).lower()]
            if filter.dag_id:
                val = filter.dag_id.lower()
                filtered_runs = [r for r in filtered_runs if val in str(r.get("dag_id", "")).lower()]
            if filter.types:
                t_list = [t.lower() for t in filter.types if t]
                if t_list:
                    filtered_runs = [r for r in filtered_runs if str(r.get("type", "")).lower() in t_list]
            if filter.destination:
                val = filter.destination.lower()
                filtered_runs = [r for r in filtered_runs if val in str(r.get("destination", "")).lower()]
            if filter.owners:
                o_list = [o.lower() for o in filter.owners if o]
                if o_list:
                    filtered_runs = [r for r in filtered_runs if any(o in [str(x).lower() for x in r.get("owners", [])] for o in o_list)]
            if filter.issuers:
                i_list = [i.lower() for i in filter.issuers if i]
                if i_list:
                    filtered_runs = [r for r in filtered_runs if str(r.get("issuer", "")).lower() in i_list]
            if filter.period:
                val = filter.period.lower()
                filtered_runs = [r for r in filtered_runs if val in str(r.get("period", "")).lower()]
            if filter.projects:
                p_list = [p.lower() for p in filter.projects if p]
                if p_list:
                    filtered_runs = [r for r in filtered_runs if str(r.get("project_id", "")).lower() in p_list]
            if filter.statuses:
                s_list = [s.lower() for s in filter.statuses if s]
                if s_list:
                    filtered_runs = [r for r in filtered_runs if str(r.get("status", "SUCCESS")).lower() in s_list]
            if filter.started_at_since:
                from datetime import datetime
                try:
                    since_dt = datetime.fromisoformat(filter.started_at_since.replace('Z', '+00:00'))
                    filtered_runs = [r for r in filtered_runs if r.get("publish_time") and datetime.fromisoformat(r["publish_time"].replace('Z', '+00:00')) >= since_dt]
                except (ValueError, TypeError):
                    pass
            if filter.started_at_until:
                from datetime import datetime
                try:
                    until_dt = datetime.fromisoformat(filter.started_at_until.replace('Z', '+00:00'))
                    filtered_runs = [r for r in filtered_runs if r.get("publish_time") and datetime.fromisoformat(r["publish_time"].replace('Z', '+00:00')) <= until_dt]
                except (ValueError, TypeError):
                    pass

        # 3. Apply Sorting
        if sort_by:
            # Map frontend IDs to backend keys if necessary
            # frontend availableColumns: job, dag, type, project, destination, issuer, owner, period, date, hour, start_time, next_start, publish_time, status
            # backend keys: job_id, dag_id, project_id, type, destination, owners, issuer, execution_time, next_start_time, period, date, hour, publish_time, status
            field_map = {
                "job": "job_id",
                "dag": "dag_id",
                "project": "project_id",
                "start_time": "execution_time",
                "next_start": "next_start_time"
            }
            sort_key = field_map.get(str(sort_by), str(sort_by))
            
            def get_sort_val(x):
                val = x.get(sort_key)
                if val is None: return ""
                if isinstance(val, list): return val[0] if val else ""
                return str(val)

            filtered_runs.sort(
                key=get_sort_val,
                reverse=(sort_order == SortOrder.DESC)
            )

        total_count = len(filtered_runs)
        
        # 4. Apply Pagination (slicing)
        paginated_runs = filtered_runs[offset : offset + limit]
        
        items = [
            JobRun(
                job_id=r["job_id"],
                dag_id=r.get("dag_id", ""),
                project_id=r.get("project_id"),
                type=r.get("type"),
                destination=r.get("destination"),
                owners=r.get("owners", []),
                issuer=r.get("issuer"),
                start_time=r["execution_time"],
                next_start_time=r.get("next_start_time"),
                period=r.get("period"),
                date=r.get("date"),
                hour=r.get("hour"),
                publish_time=r.get("publish_time")
            )
            for r in paginated_runs
        ]
        
        return RecentJobRunsResponse(
            items=items, 
            total_count=total_count, 
            facets=facets,
            sort_by=str(sort_by) if sort_by else None,
            sort_order=sort_order
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

    @strawberry.field(description="Get consolidated job statistics (by department, type, owner, month).")
    async def job_stats(self, info: Info) -> JobAggregation:
        container = info.context["container"]
        analytics_service: AnalyticsService = await container.analytics_service()
        return await analytics_service.get_job_aggregation_stats()

schema = strawberry.Schema(query=Query)

"""
GraphQL Query resolvers — thin delegation layer.
All business logic lives in the service and domain helper modules.
"""

from typing import List, Optional

import strawberry
from strawberry.types import Info

from app.api.graphql.schema import (Job, JobAggregation, JobConfig,
                                    JobConnection, JobEdge, JobFilter, JobRun,
                                    JobRunFilter, JobRunFilterFacets, JobStats,
                                    MetricGroups, PageInfo, Project,
                                    RecentJobRunsResponse, SortOrder, Table,
                                    TableConfig, TableConnection, TableEdge,
                                    TableFilter, TableStats, User)
from app.core.container import Container
from app.domain.analytics.service import AnalyticsService
from app.domain.job_explorer.job_run_helpers import (
    apply_job_run_filters, calculate_facets_from_runs, sort_job_runs)
from app.domain.job_explorer.service import JobExplorerService


def _get_container(info: Info) -> Container:
    return info.context["container"]


@strawberry.type
class Query:

    # -------------------------------------------------------------------------
    # Metrics
    # -------------------------------------------------------------------------

    @strawberry.field(description="Retrieve a list of metrics by their IDs.")
    async def metrics(self, info: Info, ids: List[str]) -> List[MetricGroups]:
        container = _get_container(info)
        analytics_service: AnalyticsService = container.analytics_service()
        return await analytics_service.get_metrics_by_ids(ids)

    # -------------------------------------------------------------------------
    # Jobs (connection, legacy paginator)
    # -------------------------------------------------------------------------

    @strawberry.field(description="Search and list Jobs with performance stats.")
    async def jobs(
        self,
        info: Info,
        first: int = 20,
        after: Optional[str] = None,
        filter: Optional[JobFilter] = None,
    ) -> JobConnection:
        container = _get_container(info)
        job_service: JobExplorerService = container.job_explorer_service()
        job_runs = await job_service.get_recent_job_runs()

        if filter:
            job_runs = apply_job_run_filters(
                job_runs,
                job_id=filter.search_term,
                owners=[filter.owner] if filter.owner else None,
                statuses=[filter.status] if filter.status else None,
                projects=[filter.project_id] if filter.project_id else None,
            )

        # Fallback mock row for local testing when BigQuery is unavailable
        if not job_runs:
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
                    "progress": 0.8,
                }
            ]

        edges = [
            JobEdge(
                node=Job(
                    id=strawberry.ID(str(r["job_id"])),
                    display_label=str(r.get("name") or r["job_id"]),
                    config=JobConfig(
                        owner=str(r["owners"][0] if r.get("owners") else "N/A"),
                        schedule="0 * * * *",
                        project_id=str(r.get("project_id", "")),
                        type=str(r.get("type")),
                    ),
                    stats=JobStats(
                        avg_slots=12.5,
                        max_slots=30,
                        total_duration_24h=3600,
                        last_run_status=str(r.get("status", "")),
                        updated_at=str(r.get("execution_time", "")),
                        duration=int(r.get("duration", 0)),
                        progress=float(r.get("progress", 0.0)),
                    ),
                ),
                cursor=str(i),
            )
            for i, r in enumerate(job_runs[:first])
        ]

        return JobConnection(
            edges=edges,
            page_info=PageInfo(
                has_next_page=len(job_runs) > first,
                end_cursor=str(first - 1),
            ),
            total_count=len(job_runs),
        )

    # -------------------------------------------------------------------------
    # Recent Job Runs (paginated, filtered, sorted)
    # -------------------------------------------------------------------------

    @strawberry.field(
        description="Retrieve a paginated list of recent job runs with optional filtering and sorting."
    )
    async def recent_job_runs(
        self,
        info: Info,
        offset: int = 0,
        limit: int = 10,
        refresh: bool = False,
        sort_by: Optional[strawberry.ID] = None,
        sort_order: SortOrder = SortOrder.DESC,
        filter: Optional[JobRunFilter] = None,
    ) -> RecentJobRunsResponse:
        container = _get_container(info)
        job_service: JobExplorerService = container.job_explorer_service()

        # Fetch full (up to 100) list for facet calculation
        all_runs = await job_service.get_recent_job_runs(limit=100, refresh=refresh)

        # Step 1 — Facets (computed from the unfiltered full list)
        facet_data = calculate_facets_from_runs(all_runs)
        facets = JobRunFilterFacets(
            owners=facet_data["owners"],
            projects=facet_data["projects"],
            types=facet_data["types"],
            issuers=facet_data["issuers"],
            statuses=facet_data["statuses"],
        )

        # Step 2 — Apply filters
        filtered = apply_job_run_filters(
            all_runs,
            job_id=filter.job_id if filter else None,
            dag_id=filter.dag_id if filter else None,
            types=filter.types if filter else None,
            destination=filter.destination if filter else None,
            owners=filter.owners if filter else None,
            issuers=filter.issuers if filter else None,
            period=filter.period if filter else None,
            projects=filter.projects if filter else None,
            statuses=filter.statuses if filter else None,
            started_at_since=filter.started_at_since if filter else None,
            started_at_until=filter.started_at_until if filter else None,
        )

        # Step 3 — Sort
        filtered = sort_job_runs(
            filtered,
            sort_by=str(sort_by) if sort_by else None,
            descending=(sort_order == SortOrder.DESC),
        )

        total_count = len(filtered)

        # Step 4 — Paginate
        page = filtered[offset : offset + limit]

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
                publish_time=r.get("publish_time"),
            )
            for r in page
        ]

        return RecentJobRunsResponse(
            items=items,
            total_count=total_count,
            facets=facets,
            sort_by=str(sort_by) if sort_by else None,
            sort_order=sort_order,
        )

    # -------------------------------------------------------------------------
    # Tables (stub)
    # -------------------------------------------------------------------------

    @strawberry.field(
        description="Search and list Tables with metadata and update stats."
    )
    async def tables(
        self,
        info: Info,
        first: int = 20,
        after: Optional[str] = None,
        filter: Optional[TableFilter] = None,
    ) -> TableConnection:
        mock_tables = [
            {
                "id": "t1",
                "fqn": "project.dataset.table_analytics",
                "owners": ["data-eng-team"],
                "row_count": 1_500_000,
                "update_mode": "APPEND",
            }
        ]

        edges = [
            TableEdge(
                node=Table(
                    id=strawberry.ID(str(t["id"])),
                    fqn=str(t["fqn"]),
                    config=TableConfig(owners=list(t["owners"])),  # type: ignore
                    stats=TableStats(
                        row_count=int(t["row_count"]),  # type: ignore
                        update_mode=str(t["update_mode"]),
                        last_update_time="2026-02-24T12:00:00Z",
                    ),
                ),
                cursor="0",
            )
            for t in mock_tables
        ]

        return TableConnection(
            edges=edges,
            page_info=PageInfo(has_next_page=False, end_cursor="0"),
            total_count=len(mock_tables),
        )

    # -------------------------------------------------------------------------
    # Stubs — User / Project / JobStats
    # -------------------------------------------------------------------------

    @strawberry.field(description="Get a single user by ID.")
    async def user(self, info: Info, id: strawberry.ID) -> Optional[User]:
        return User(
            id=id,
            username="demo_user",
            full_name="Demo User",
            email="demo@example.com",
        )

    @strawberry.field(description="Get a single project by ID.")
    async def project(self, info: Info, id: strawberry.ID) -> Optional[Project]:
        return Project(
            id=id, display_name="Demo Project", description="A demonstration project"
        )

    @strawberry.field(description="List all users.")
    async def users(self, info: Info) -> List[User]:
        return [
            User(id=strawberry.ID("u1"), username="admin", full_name="Administrator"),
            User(id=strawberry.ID("u2"), username="viewer", full_name="Data Viewer"),
        ]

    @strawberry.field(description="List all projects.")
    async def projects(self, info: Info) -> List[Project]:
        return [
            Project(id=strawberry.ID("p1"), display_name="Sales Analytics"),
            Project(id=strawberry.ID("p2"), display_name="Platform Monitoring"),
        ]

    @strawberry.field(
        description="Get consolidated job statistics (by department, type, owner, month)."
    )
    async def job_stats(self, info: Info) -> JobAggregation:
        container = _get_container(info)
        analytics_service: AnalyticsService = container.analytics_service()
        return await analytics_service.get_job_aggregation_stats()


schema = strawberry.Schema(query=Query)

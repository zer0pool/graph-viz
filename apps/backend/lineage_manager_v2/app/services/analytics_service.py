from typing import Dict, Any
from app.infrastructure.unit_of_work import UnitOfWork
from app.api.v1.schemas.analytics import DashboardMetricsResponse, MetricItem, MetricBreakdown

class AnalyticsService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_dashboard_metrics(self) -> DashboardMetricsResponse:
        """
        Aggregates counts from MySQL to match the standardized Lineage Manager format.
        """
        async with self.uow:
            # 1. Fetch data from repositories
            total_tables = await self.uow.graph.count_nodes_by_type("table")
            total_jobs = await self.uow.graph.count_nodes_by_type("job")
            total_users = await self.uow.users.count()
            job_dist = await self.uow.jobs.count_by_type()

            # 2. Build final metrics list
            metrics = [
                # Tables
                MetricItem(
                    type="total_tables",
                    value=total_tables,
                    subtext="Across all schemas",
                    status="default"
                ),
                # Jobs with Breakdown
                MetricItem(
                    type="total_jobs",
                    value=total_jobs,
                    subtext="Active Jobs",
                    status="default",
                    breakdown=[
                        MetricBreakdown(label="Self-Type", value=job_dist.get("SELF-TYPE", 0)),
                        MetricBreakdown(label="Request-Type", value=job_dist.get("REQUEST-TYPE", 0)),
                    ]
                ),
                # Users
                MetricItem(
                    type="total_users",
                    value=total_users,
                    subtext="Total Users",
                    status="default"
                ),
                # Active Alerts (Mock/Placeholder)
                MetricItem(
                    type="dummy_chart",
                    value=12,
                    subtext="Active Alerts",
                    status="warning"
                ),
                # Daily Ingestion (Mock/Placeholder - BigQuery not yet integrated in V2)
                MetricItem(
                    type="dummy_chart",
                    value="2.4 TB",
                    subtext="Daily Ingestion",
                    status="default"
                )
            ]
            return DashboardMetricsResponse(metrics=metrics)

    async def get_internal_stats(self) -> Dict[str, Any]:
        """
        Consolidated stats for internal service consumption (Analytics Manager BFF).
        """
        async with self.uow:
            total_tables = await self.uow.graph.count_nodes_by_type("table")
            total_jobs = await self.uow.graph.count_nodes_by_type("job")
            total_users = await self.uow.users.count()
            total_projects = await self.uow.projects.count()
            total_data_assets = await self.uow.data_nodes.count()
            total_audits = await self.uow.audits.count()
            return {
                "jobs": {
                    "total": total_jobs,
                    "type_counts": await self.uow.jobs.count_by_type(),
                    "department_counts": await self.uow.jobs.count_by_department(),
                    "owner_counts": await self.uow.jobs.count_by_owner(),
                    "monthly_counts": await self.uow.jobs.count_by_created_month()
                },
                "tables": {
                    "total": total_tables
                },
                "users": {
                    "total": total_users
                },
                "projects": {
                    "total": total_projects
                },
                "data_assets": {
                    "total": total_data_assets
                },
                "audits": {
                    "total": total_audits
                }
            }

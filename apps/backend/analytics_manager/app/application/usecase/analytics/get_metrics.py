import asyncio
import json
import logging
from typing import Any, Dict, List

from redis.asyncio import Redis

from app.domain.entity.analytics import MetricBreakdown, MetricGroup
from app.domain.gateway.lineage_gateway import LineageGateway
from app.domain.repository.analytics_repository import AnalyticsRepository

logger = logging.getLogger(__name__)


class GetMetricsUseCase:
    COLOR_MAP = {
        "SELF-TYPE": "bg-blue-600",
        "REQUEST-TYPE": "bg-amber-500",
        "OTHER": "bg-gray-400",
    }

    def __init__(
        self,
        analytics_repo: AnalyticsRepository,
        lineage_gateway: LineageGateway,
        redis: Redis,
    ):
        self.repo = analytics_repo
        self.lineage = lineage_gateway
        self.redis = redis

    async def execute(self, ids: List[str]) -> List[MetricGroup]:
        """Resolves a list of metric IDs into MetricGroups."""
        tasks = []
        for metric_id in ids:
            resolver_name = f"_resolve_{metric_id}"
            if hasattr(self, resolver_name):
                resolver = getattr(self, resolver_name)
                tasks.append(resolver())
            else:
                logger.warning(f"No resolver found for metric ID: {metric_id}")
                tasks.append(self._resolve_dummy(metric_id))

        results = await asyncio.gather(*tasks)

        flattened = []
        for item in results:
            if isinstance(item, list):
                flattened.extend(item)
            else:
                flattened.append(item)
        return flattened

    async def get_overview_summary(self) -> List[MetricGroup]:
        ids = ["total_jobs", "active_users", "total_tables", "failed_24h"]
        return await self.execute(ids)

    async def get_jobs_summary(self) -> List[MetricGroup]:
        ids = ["total_jobs", "running_now", "failed_24h", "avg_duration", "queued_jobs"]
        return await self.execute(ids)

    async def get_tables_summary(self) -> List[MetricGroup]:
        ids = [
            "total_tables",
            "total_size",
            "expiring_soon",
            "lineage_coverage",
            "metadata_health",
        ]
        return await self.execute(ids)

    async def get_users_summary(self) -> List[MetricGroup]:
        ids = ["active_users", "admin_users", "api_keys"]
        return await self.execute(ids)

    # --- Standard Resolvers returning MetricGroup ---
    async def _resolve_total_jobs(self) -> MetricGroup:
        stats = await self._get_internal_stats()
        job_stats = stats.get("jobs", {})
        count = job_stats.get("total", 0)

        type_counts = job_stats.get("type_counts", {})
        breakdown = []

        for jtype, cnt in type_counts.items():
            label = (
                "Self"
                if jtype == "SELF-TYPE"
                else (
                    "Request"
                    if jtype == "REQUEST-TYPE"
                    else "Other"
                    if jtype == "OTHER"
                    else jtype
                )
            )
            breakdown.append(
                MetricBreakdown(
                    label=label,
                    value=float(cnt),
                    color=self.COLOR_MAP.get(jtype, "bg-gray-400"),
                )
            )

        return MetricGroup(
            id="total_jobs",
            label="Total Jobs",
            count=count,
            status="success",
            breakdown=breakdown if breakdown else None,
        )

    async def _resolve_active_users(self) -> MetricGroup:
        stats = await self._get_internal_stats()
        count = stats.get("users", {}).get("total", 0)
        return MetricGroup(
            id="active_users", label="Active Users", count=count, status="info"
        )

    async def _resolve_total_tables(self) -> MetricGroup:
        stats = await self._get_internal_stats()
        count = stats.get("tables", {}).get("total", 0)
        return MetricGroup(
            id="total_tables", label="Total Tables", count=count, status="default"
        )

    async def _resolve_failed_24h(self) -> MetricGroup:
        return MetricGroup(
            id="failed_24h", label="Failed (24h)", count=5, status="destructive"
        )

    async def _resolve_running_now(self) -> MetricGroup:
        return MetricGroup(
            id="running_now", label="Running Now", count=2, status="success"
        )

    async def _resolve_avg_duration(self) -> MetricGroup:
        return MetricGroup(
            id="avg_duration", label="Avg Duration", count=45, status="default"
        )

    async def _resolve_queued_jobs(self) -> MetricGroup:
        return MetricGroup(
            id="queued_jobs", label="Queued Jobs", count=0, status="info"
        )

    async def _resolve_total_size(self) -> MetricGroup:
        return MetricGroup(
            id="total_size", label="Total Size (TB)", count=124, status="success"
        )

    async def _resolve_expiring_soon(self) -> MetricGroup:
        return MetricGroup(
            id="expiring_soon", label="Expiring (7d)", count=12, status="warning"
        )

    async def _resolve_lineage_coverage(self) -> MetricGroup:
        return MetricGroup(
            id="lineage_coverage", label="Lineage Coverage", count=88, status="info"
        )

    async def _resolve_metadata_health(self) -> MetricGroup:
        return MetricGroup(
            id="metadata_health", label="Metadata Health", count=94, status="success"
        )

    async def _resolve_admin_users(self) -> MetricGroup:
        return MetricGroup(
            id="admin_users", label="Admin Users", count=3, status="default"
        )

    async def _resolve_api_keys(self) -> MetricGroup:
        return MetricGroup(
            id="api_keys", label="Active API Keys", count=15, status="info"
        )

    async def _resolve_dummy(self, metric_id: str) -> MetricGroup:
        return MetricGroup(
            id=metric_id, label=f"Metric {metric_id}", count=0, status="default"
        )

    async def _get_internal_stats(self) -> Dict[str, Any]:
        cache_key = "internal:stats:lineage"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        stats = await self.lineage.get_internal_stats()
        if stats:
            await self.redis.setex(cache_key, 60, json.dumps(stats))
        return stats or {}

    async def get_job_aggregation_stats(self) -> Any:
        from app.api.graphql.schema import (
            DepartmentCount,
            JobAggregation,
            MonthCount,
            OwnerCount,
            TypeCount,
        )

        stats = await self._get_internal_stats()
        job_data = stats.get("jobs", {})

        return JobAggregation(
            total=job_data.get("total", 0),
            by_department=[
                DepartmentCount(department=k, count=v)
                for k, v in job_data.get("department_counts", {}).items()
            ],
            by_type=[
                TypeCount(type=k, count=v)
                for k, v in job_data.get("type_counts", {}).items()
            ],
            by_owner=[
                OwnerCount(owner=k, count=v)
                for k, v in job_data.get("owner_counts", {}).items()
            ],
            by_created_month=[
                MonthCount(year=m["year"], month=m["month"], count=m["count"])
                for m in job_data.get("monthly_counts", [])
            ],
        )

import logging
import json
import asyncio
import strawberry
from datetime import datetime
from typing import List, Dict, Any, Optional

from redis.asyncio import Redis
from app.infrastructure.lineage_client import LineageClient
from app.domain.analytics.repository import AnalyticsRepository
from app.domain.analytics.schemas import TrackEvent
from app.api.graphql.schema import MetricGroups, MetricStatus, TrendPoint, MetricDimensions, MetricBreakdown

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, repo: AnalyticsRepository, lineage_client: LineageClient, redis: Redis):
        self.repo = repo
        self.lineage = lineage_client
        self.redis = redis
        
        # Metric Registry: ID -> Resolver Method
        self.registry = {
            # Simple Metrics (Layer 1)
            "total_jobs": self._resolve_total_jobs,
            "active_users": self._resolve_active_users,
            "total_tables": self._resolve_total_tables,
            "failed_24h": self._resolve_failed_24h,
            "running_now": self._resolve_running_now,
            "avg_duration": self._resolve_avg_duration,
            "queued_jobs": self._resolve_queued_jobs,
            
            # Tables Page Metrics
            "total_size": self._resolve_total_size,
            "expiring_soon": self._resolve_expiring_soon,
            "lineage_coverage": self._resolve_lineage_coverage,
            "metadata_health": self._resolve_metadata_health,

            # Users Page Metrics
            "total_users": self._resolve_active_users, # Reuse active users for total for now
            "admin_users": self._resolve_admin_users,
            "api_keys": self._resolve_api_keys,

            # Complex Metrics (Layer 2)
            "active_users_yoy_comparison": self._resolve_active_users_yoy,
            "top_visited_pages": self._resolve_top_visited,
            "job_type_breakdown": self._resolve_job_distribution,
            "job_department_distribution": self._resolve_job_department_distribution,
        }

    async def get_metrics_by_ids(self, ids: List[str]) -> List[MetricGroups]:
        """Resolves a list of metric IDs into MetricGroups (Cloudflare Style)."""
        tasks = []
        for metric_id in ids:
            resolver = self.registry.get(metric_id)
            if resolver:
                tasks.append(resolver())
            else:
                logger.warning(f"No resolver found for metric ID: {metric_id}")
                tasks.append(self._resolve_dummy(metric_id))
        
        results = await asyncio.gather(*tasks)
        
        # Flatten the list because some resolvers (like breakdown) return lists
        flattened = []
        for item in results:
            if isinstance(item, list):
                flattened.extend(item)
            else:
                flattened.append(item)
        return flattened

    # --- Resolvers (Standardized Return: MetricGroups) ---

    async def _resolve_total_jobs(self) -> MetricGroups:
        stats = await self._get_internal_stats()
        job_stats = stats.get("jobs", {})
        count = job_stats.get("total", 0)
        
        # Populate breakdown from type_counts
        type_counts = job_stats.get("type_counts", {})
        breakdown = []
        
        # Mapping for better labels and colors
        color_map = {
            "SELF-TYPE": "bg-blue-600",
            "REQUEST-TYPE": "bg-amber-500",
            "OTHER": "bg-gray-400"
        }
        
        for jtype, cnt in type_counts.items():
            label = "Self" if jtype == "SELF-TYPE" else "Request" if jtype == "REQUEST-TYPE" else "Other" if jtype == "OTHER" else jtype
            breakdown.append(MetricBreakdown(
                label=label,
                value=float(cnt),
                color=color_map.get(jtype, "bg-gray-400")
            ))
            
        return MetricGroups(
            id=strawberry.ID("total_jobs"), 
            label="Total Jobs", 
            count=count, 
            status=MetricStatus.SUCCESS,
            breakdown=breakdown if breakdown else None
        )

    async def _resolve_active_users(self) -> MetricGroups:
        stats = await self._get_internal_stats()
        count = stats.get("users", {}).get("total", 0) # Mocking active as total for now
        return MetricGroups(id=strawberry.ID("active_users"), label="Active Users", count=count, status=MetricStatus.INFO)

    async def _resolve_total_tables(self) -> MetricGroups:
        stats = await self._get_internal_stats()
        count = stats.get("tables", {}).get("total", 0)
        return MetricGroups(id=strawberry.ID("total_tables"), label="Total Tables", count=count, status=MetricStatus.DEFAULT)

    async def _resolve_failed_24h(self) -> MetricGroups:
        # This might need bigquery or an enhanced internal stats
        stats = await self._get_internal_stats()
        # Mocking failed for now until internal stats includes more details
        return MetricGroups(id=strawberry.ID("failed_24h"), label="Failed (24h)", count=5, status=MetricStatus.DESTRUCTIVE)

    async def _resolve_running_now(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("running_now"), label="Running Now", count=2, status=MetricStatus.SUCCESS)

    async def _resolve_active_users_yoy(self) -> MetricGroups:
        # Multi-series Trend Example
        history = [
            TrendPoint(time="Jan", value=100, series="2025"),
            TrendPoint(time="Feb", value=120, series="2025"),
            TrendPoint(time="Jan", value=150, series="2026"),
            TrendPoint(time="Feb", value=180, series="2026"),
        ]
        return MetricGroups(id=strawberry.ID("active_users_yoy"), label="YoY Comparison", history=history)

    async def _resolve_job_distribution(self) -> List[MetricGroups]:
        # This resolver returns a list for breakdowns (Top N style)
        stats = await self._get_internal_stats()
        dist = stats.get("jobs", {}).get("type_counts", {})
        results = []
        for jtype, count in dist.items():
            results.append(MetricGroups(
                id=strawberry.ID(f"job_type_{jtype}"),
                label=jtype,
                count=count,
                dimensions=MetricDimensions(type=jtype)
            ))
        return results

    async def _resolve_job_department_distribution(self) -> List[MetricGroups]:
        """Resolves distribution of jobs by owner department."""
        stats = await self._get_internal_stats()
        dist = stats.get("jobs", {}).get("department_counts", {})
        results = []
        for dept, count in dist.items():
            results.append(MetricGroups(
                id=strawberry.ID(f"job_dept_{dept}"),
                label=dept,
                count=count,
                dimensions=MetricDimensions(name=dept) # Use name dimension for heatmap labels
            ))
        return results

    async def _resolve_top_visited(self) -> MetricGroups:
        # Integration with existing Redis logic
        visit_key = "analytics:path_visits"
        top_paths = await self.redis.zrevrange(visit_key, 0, 4, withscores=True)
        # Simplify to sum of top visits for example
        total_top = int(sum(score for _, score in top_paths))
        return MetricGroups(id=strawberry.ID("top_visited_pages"), label="Top Page Visits", sum=float(total_top))

    async def _resolve_dummy(self, metric_id: str) -> MetricGroups:
        return MetricGroups(id=strawberry.ID(metric_id), label=f"Metric {metric_id}", count=0, status=MetricStatus.DEFAULT)

    # --- New Placeholder Resolvers ---

    async def _resolve_avg_duration(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("avg_duration"), label="Avg Duration", count=45, status=MetricStatus.DEFAULT)

    async def _resolve_queued_jobs(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("queued_jobs"), label="Queued Jobs", count=0, status=MetricStatus.INFO)

    async def _resolve_total_size(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("total_size"), label="Total Size (TB)", count=124, status=MetricStatus.SUCCESS)

    async def _resolve_expiring_soon(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("expiring_soon"), label="Expiring (7d)", count=12, status=MetricStatus.WARNING)

    async def _resolve_lineage_coverage(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("lineage_coverage"), label="Lineage Coverage", count=88, status=MetricStatus.INFO)

    async def _resolve_metadata_health(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("metadata_health"), label="Metadata Health", count=94, status=MetricStatus.SUCCESS)

    async def _resolve_admin_users(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("admin_users"), label="Admin Users", count=3, status=MetricStatus.DEFAULT)

    async def _resolve_api_keys(self) -> MetricGroups:
        return MetricGroups(id=strawberry.ID("api_keys"), label="Active API Keys", count=15, status=MetricStatus.INFO)

    # --- Helper: Internal Stats Proxy ---

    async def _get_internal_stats(self) -> Dict[str, Any]:
        cache_key = "internal:stats:lineage"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        stats = await self.lineage.get_internal_stats()
        if stats:
            await self.redis.setex(cache_key, 60, json.dumps(stats)) # Cache for 1 min
        return stats or {}

    # --- Legacy Compatibility (Restored for REST Endpoints) ---

    # --- Pages Summary (Restored for REST Endpoints) ---

    async def get_overview_summary(self) -> Dict[str, Any]:
        ids = ["total_jobs", "active_users", "total_tables", "system_health", "failed_24h"]
        metrics = await self.get_metrics_by_ids(ids)
        return {"metrics": [self._map_to_rest(m) for m in metrics]}

    async def get_jobs_summary(self) -> Dict[str, Any]:
        ids = ["total_jobs", "running_now", "failed_24h", "avg_duration", "queued_jobs"]
        metrics = await self.get_metrics_by_ids(ids)
        return {"metrics": [self._map_to_rest(m) for m in metrics]}

    async def get_tables_summary(self) -> Dict[str, Any]:
        ids = ["total_tables", "total_size", "expiring_soon", "lineage_coverage", "metadata_health"]
        metrics = await self.get_metrics_by_ids(ids)
        return {"metrics": [self._map_to_rest(m) for m in metrics]}

    async def get_users_summary(self) -> Dict[str, Any]:
        ids = ["total_users", "active_users", "admin_users", "api_keys"]
        metrics = await self.get_metrics_by_ids(ids)
        return {"metrics": [self._map_to_rest(m) for m in metrics]}

    def _map_to_rest(self, m: MetricGroups) -> Dict[str, Any]:
        """Maps MetricGroups to legacy REST format."""
        return {
            "type": str(m.id),
            "label": m.label,
            "value": m.count if m.count is not None else m.sum if m.sum is not None else 0,
            "status": m.status.value if hasattr(m.status, "value") else m.status,
            "breakdown": [
                {"label": b.label, "value": b.value, "color": b.color}
                for b in (m.breakdown or [])
            ] if m.breakdown else None
        }

    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Provides operational metrics for the legacy REST API."""
        ids = ["total_jobs", "active_users", "total_tables", "failed_24h"]
        metrics = await self.get_metrics_by_ids(ids)
        # Map to the format expected by the frontend
        return {
            "total_jobs": next((m.count for m in metrics if str(m.id) == "total_jobs"), 0),
            "active_users": next((m.count for m in metrics if str(m.id) == "active_users"), 0),
            "total_tables": next((m.count for m in metrics if str(m.id) == "total_tables"), 0),
            "failed_24h": next((m.count for m in metrics if str(m.id) == "failed_24h"), 0),
        }

    async def get_job_aggregation_stats(self) -> Any:
        """Fetch multi-dimension job statistics for GraphQL consumption."""
        from app.api.graphql.schema import (
            JobAggregation, DepartmentCount, TypeCount, OwnerCount, MonthCount
        )
        stats = await self._get_internal_stats()
        job_data = stats.get("jobs", {})
        
        return JobAggregation(
            total=job_data.get("total", 0),
            by_department=[DepartmentCount(department=k, count=v) for k, v in job_data.get("department_counts", {}).items()],
            by_type=[TypeCount(type=k, count=v) for k, v in job_data.get("type_counts", {}).items()],
            by_owner=[OwnerCount(owner=k, count=v) for k, v in job_data.get("owner_counts", {}).items()],
            by_created_month=[MonthCount(year=m["year"], month=m["month"], count=m["count"]) for m in job_data.get("monthly_counts", [])]
        )


    async def get_top_visited(self) -> Dict[str, Any]:
        """Provides top visited pages for the legacy REST API."""
        # Integration with existing Redis logic for detailed items
        visit_key = "analytics:path_visits"
        top_paths = await self.redis.zrevrange(visit_key, 0, 4, withscores=True)
        
        # Mapping for display titles
        title_map = {
            "/": "dashboard",
            "/projects": "projects",
            "/users": "users",
            "/jobs": "jobs",
            "/tables": "tables",
            "/lineage": "lineage",
            "/audit": "audit",
            "/settings": "settings"
        }
        
        items = []
        for path_bytes, score in top_paths:
            path = path_bytes.decode() if isinstance(path_bytes, bytes) else path_bytes
            # Use title from map or derive from path
            title = title_map.get(path)
            if not title:
                 # Fallback: /jobs/foo -> jobs
                 title = path.strip("/").split("/")[0] or "dashboard"

            items.append({
                "path": path,
                "title": title,
                "count": int(score)
            })

        return {
            "items": items,
            "window_hours": 168 # As requested in example
        }

    async def track_event(self, event: TrackEvent) -> bool:
        # Keep tracking logic as is
        queue_key = "analytics:raw_events"
        try:
            event_data = event.model_dump()
            ts = event_data.get("timestamp")
            event_data["timestamp"] = ts.isoformat() if isinstance(ts, datetime) else datetime.utcnow().isoformat()
            await self.redis.lpush(queue_key, json.dumps(event_data))  # type: ignore
            return True
        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            return False

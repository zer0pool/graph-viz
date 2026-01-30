import logging
import time
from datetime import datetime
from typing import List, Optional

import redis
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel

from lineage_manager.core.config import get_settings
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.graph_query_service import GraphQueryService

settings = get_settings()
logger = logging.getLogger("analytics")

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["analytics"],
)


class TrackRequest(BaseModel):
    event_type: str = "page_view"
    visitor_id: str
    path: str
    title: str = ""
    timestamp: Optional[str] = None


@router.post("/track")
@inject
async def track_event(
    request: Request,
    body: TrackRequest,
    redis_client: redis.Redis = Depends(Provide[GraphContainer.core.redis_client]),
):
    """
    Track user activity for analytics and real-time rankings.
    1. Log to stdout for Log Router -> BigQuery.
    2. Write to Redis for real-time Top Visited.
    """
    user_id = "anonymous"
    # Basic auth check if available (assuming request.state.user exists if authenticated)
    if hasattr(request.state, "user") and request.state.user:
        user_id = getattr(request.state.user, "user_id", "anonymous")

    # 1. Log to stdout with specific prefix
    now = datetime.utcnow().isoformat()
    log_msg = f"[activity_log] {user_id}!{body.visitor_id}!{body.path}!{body.title}!{request.client.host}!{now}"
    # Using print for stdout as logger might be configured differently
    print(log_msg)

    # 2. Redis Real-time counting (Sliding Window - Hourly Bucket)
    if settings.redis.enabled:
        current_hour_key = f"visits:{datetime.utcnow().strftime('%Y%m%d%H')}"
        try:
            # Increment score for this path
            redis_client.zincrby(current_hour_key, 1, body.path)
            # Set TTL based on retention settings (default 24h + buffer)
            retention_seconds = settings.redis.analytics_retention_hours * 3600
            redis_client.expire(current_hour_key, retention_seconds)
        except Exception as e:
            logger.error(f"Failed to update redis stats: {e}")

    return {"status": "success"}


@router.get("/top-visited")
@inject
async def get_top_visited(
    redis_client: redis.Redis = Depends(Provide[GraphContainer.core.redis_client]),
    limit: int = 5,
):
    """
    Aggregate recent hourly buckets from Redis to provide top-visted pages.
    """
    if not settings.redis.enabled:
        return {"items": []}

    # Get recent N hours keys
    window_hours = settings.redis.analytics_window_hours
    now = datetime.utcnow()
    keys = []
    for i in range(window_hours):
        h = now.replace(minute=0, second=0, microsecond=0)
        # In a real scenario, you'd subtract hours correctly
        # Here we just use a simplified approach for demonstration
        # Actually we should use timedelta
        from datetime import timedelta

        target_time = now - timedelta(hours=i)
        keys.append(f"visits:{target_time.strftime('%Y%m%d%H')}")

    # Use a temporary key for union
    temp_key = f"temp:top_visited:{int(time.time())}"

    try:
        # Union the scores from recent buckets
        # filter out keys that don't exist
        existing_keys = [k for k in keys if redis_client.exists(k)]
        if not existing_keys:
            return {"items": []}

        redis_client.zunionstore(temp_key, existing_keys)

        # Get top elements
        results = redis_client.zrevrange(temp_key, 0, limit - 1, withscores=True)

        # Cleanup temp key
        redis_client.delete(temp_key)

        # Format response
        items = []
        for path, score in results:
            items.append(
                {
                    "path": path,
                    "title": path.split("/")[-1] or "home",  # Simplified
                    "count": int(score),
                }
            )

        return {"items": items}
    except Exception as e:
        logger.error(f"Failed to get top visited from redis: {e}")
        return {"items": []}


@router.get("/dashboard-metrics")
@inject
async def get_dashboard_metrics(
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """
    Return summary metrics for the dashboard landing page.
    """
    try:
        data = svc.get_dashboard_metrics()

        return {
            "metrics": [
                {
                    "type": "total_tables",
                    "value": data.get("total_tables", 0),
                    "subtext": "Across all schemas",
                },
                {
                    "type": "total_jobs",
                    "value": data.get("total_jobs", 0),
                    "subtext": "Active pipelines",
                },
                {
                    "type": "dummy_chart",
                    "value": data.get("system_health", "N/A"),
                    "subtext": "System Health",
                },
                {
                    "type": "dummy_chart",
                    "value": data.get("active_alerts", 0),
                    "subtext": "Active Alerts",
                    "status": "warning",
                },
                {
                    "type": "dummy_chart",
                    "value": data.get("daily_ingestion", "0 B"),
                    "subtext": "Daily Ingestion",
                },
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")



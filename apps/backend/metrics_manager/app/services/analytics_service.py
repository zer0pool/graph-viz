from app.infrastructure.gcp.bigquery import BigQueryClient
from app.core.config import settings
from typing import List, Dict, Any
from fastapi.concurrency import run_in_threadpool
import logging
import json
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, bq_client: BigQueryClient, redis: Redis):
        self.bq_client = bq_client
        self.redis = redis

    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Aggregates metrics from BigQuery and (in future) MySQL.
        Uses Redis caching for BigQuery results to reduce latency and costs.
        """
        # 1. BigQuery Metrics (Ingestion Volume)
        cache_key = "dashboard:metrics:bq"
        bq_metrics = []
        
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                bq_metrics = json.loads(cached)
                logger.info("Cache Hit for dashboard metrics")
        except Exception as e:
            logger.warning(f"Redis Cache Miss/Error: {e}")

        if not bq_metrics:
            bq_metrics = await self._get_bq_ingestion_stats()
            # Only cache if we got valid results
            if bq_metrics and not any(m.get("status") == "error" for m in bq_metrics):
                try:
                    await self.redis.setex(cache_key, 300, json.dumps(bq_metrics))
                except Exception as e:
                     logger.error(f"Redis Set Error: {e}")
        
        # 2. Database Metrics (Placeholder - connect to DB later)
        # These are fast enough to query directly (or cache separately)
        db_metrics = [
            {"type": "total_tables", "value": 156, "subtext": "Across all schemas"},
            {"type": "total_jobs", "value": 42, "subtext": "Active Jobs"},
            {"type": "total_users", "value": 8, "subtext": "Total Users"},
        ]
        
        return {
            "metrics": db_metrics + bq_metrics
        }

    async def get_top_visited(self) -> Dict[str, Any]:
        """
        Returns top visited pages based on real data stored in Redis.
        """
        cache_key = "analytics:path_visits"
        title_key = "analytics:path_titles"
        
        try:
            # Get top 5 paths from Redis Sorted Set
            # result is a list of (member, score)
            top_paths = await self.redis.zrevrange(cache_key, 0, 4, withscores=True)
            
            items = []
            for path, count in top_paths:
                title = await self.redis.hget(title_key, path) or path.split("/")[-1]
                items.append({
                    "path": path,
                    "title": title,
                    "count": int(count)
                })
            
            return {
                "window_hours": 24, # Aggregate of all time for now
                "items": items
            }
        except Exception as e:
            logger.error(f"Error fetching top visited: {e}")
            return {"window_hours": 0, "items": []}

    async def track_event(self, event: Any) -> bool:
        """
        Tracks a visit event by incrementing its count in Redis.
        """
        visit_key = "analytics:path_visits"
        title_key = "analytics:path_titles"
        
        try:
            # 1. Increment the visit count
            await self.redis.zincrby(visit_key, 1, event.path)
            
            # 2. Store title for the path if provided
            if event.title:
                await self.redis.hset(title_key, event.path, event.title)
            
            logger.debug(f"Tracked event: {event.path}")
            return True
        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            return False

    async def _get_bq_ingestion_stats(self) -> List[Dict[str, Any]]:
        table_name = settings.FEATURE_BIGQUERY_HISTORY_TABLE
        try:
            # Example query assuming 'row_count' and 'load_time' columns exist.
            # If the table schema is different, this needs adjustment.
            query = f"""
                SELECT 
                    COUNT(*) as total_loads,
                    COALESCE(SUM(row_count), 0) as total_rows
                FROM `{table_name}`
                WHERE load_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
            """
            
            # Run blocking BQ call in threadpool
            results = await run_in_threadpool(self.bq_client.query, query)
            
            if results:
                row = results[0]
                return [
                    {"type": "daily_rows", "value": f"{int(row['total_rows']):,}", "subtext": "Rows (24h)"},
                    {"type": "daily_loads", "value": row['total_loads'], "subtext": "Loads (24h)"}
                ]
            return []
            
        except Exception as e:
            logger.error(f"Error fetching BigQuery stats: {e}")
            # Identify specific error (e.g., table not found)
            return [{"type": "bq_status", "value": "Error", "subtext": "Check Logs", "status": "error"}]

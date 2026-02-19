import logging
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from fastapi.concurrency import run_in_threadpool

from app.infrastructure.gcp.bigquery import BigQueryClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, bq_client: BigQueryClient, redis: Redis, db_session_factory: async_sessionmaker[AsyncSession]):
        self.bq_client = bq_client
        self.redis = redis
        self.db_session_factory = db_session_factory

    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Aggregates metrics from BigQuery and MySQL.
        Uses asyncio.gather for parallel fetching and Redis caching for BQ results.
        """
        cache_key = "dashboard:metrics:bq"
        
        # Try fetching from cache first
        bq_metrics: Optional[List[Dict[str, Any]]] = None
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                bq_metrics = json.loads(cached)
                logger.debug("Dashboard metrics cache hit")
        except Exception as e:
            logger.warning(f"Failed to read from Redis: {e}")

        # Fetch both DB counts and BQ stats (if not cached) in parallel
        if bq_metrics:
            db_metrics = await self._get_db_counts()
        else:
            # Parallel fetch
            db_task = asyncio.create_task(self._get_db_counts())
            bq_task = asyncio.create_task(self._get_bq_ingestion_stats())
            
            db_metrics, bq_metrics = await asyncio.gather(db_task, bq_task)
            
            # Cache valid BQ results
            if bq_metrics and not any(m.get("status") == "error" for m in bq_metrics):
                asyncio.create_task(self._set_cache(cache_key, bq_metrics, expire=300))
        
        return {
            "metrics": db_metrics + bq_metrics
        }

    async def _get_db_counts(self) -> List[Dict[str, Any]]:
        """Fetch actual counts from MySQL in parallel"""
        queries = {
            "total_tables": "SELECT COUNT(*) FROM graph_node WHERE node_type = 'table'",
            "total_jobs": "SELECT COUNT(*) FROM job_node",
            "total_users": "SELECT COUNT(*) FROM user_account"
        }
        
        try:
            async with self.db_session_factory() as session:
                tasks = []
                keys = list(queries.keys())
                for key in keys:
                    tasks.append(session.execute(text(queries[key])))
                
                results = await asyncio.gather(*tasks)
                counts = {keys[i]: results[i].scalar() or 0 for i in range(len(keys))}

                return [
                    {"type": "total_tables", "value": counts["total_tables"], "subtext": "Across all schemas"},
                    {"type": "total_jobs", "value": counts["total_jobs"], "subtext": "Active Jobs"},
                    {"type": "total_users", "value": counts["total_users"], "subtext": "Total Users"},
                ]
        except Exception as e:
            logger.error(f"Error fetching DB counts: {e}", exc_info=True)
            return [
                {"type": "total_tables", "value": 0, "subtext": "N/A"},
                {"type": "total_jobs", "value": 0, "subtext": "N/A"},
                {"type": "total_users", "value": 0, "subtext": "N/A"},
            ]

    async def get_top_visited(self) -> Dict[str, Any]:
        """
        Returns top visited pages based on real data stored in Redis.
        """
        visit_key = "analytics:path_visits"
        title_key = "analytics:path_titles"
        
        try:
            top_paths = await self.redis.zrevrange(visit_key, 0, 4, withscores=True)
            if not top_paths:
                return {"window_hours": 24, "items": []}

            # Fetch titles in batch if possible, or parallel
            items = []
            for path, count in top_paths:
                title = await self.redis.hget(title_key, path) or path.split("/")[-1]
                items.append({
                    "path": path,
                    "title": title,
                    "count": int(count)
                })
            
            return {
                "window_hours": 24,
                "items": items
            }
        except Exception as e:
            logger.error(f"Error fetching top visited: {e}")
            return {"window_hours": 0, "items": []}

    async def track_event(self, event: Any) -> bool:
        """
        Tracks a visit event by incrementing its count in Redis
        AND pushing the raw event for background BQ ingestion.
        """
        visit_key = "analytics:path_visits"
        title_key = "analytics:path_titles"
        queue_key = "analytics:raw_events"
        
        try:
            # 1. Real-time stats
            await self.redis.zincrby(visit_key, 1, event.path)
            if event.title:
                await self.redis.hset(title_key, event.path, event.title)
            
            # 2. Queue for BQ
            event_data = event.model_dump()
            ts = event_data.get("timestamp")
            if ts and isinstance(ts, datetime):
                event_data["timestamp"] = ts.isoformat()
            else:
                event_data["timestamp"] = datetime.utcnow().isoformat()
            
            await self.redis.lpush(queue_key, json.dumps(event_data))
            return True
        except Exception as e:
            logger.error(f"Failed to track event {event.path}: {e}")
            return False

    async def _get_bq_ingestion_stats(self) -> List[Dict[str, Any]]:
        table_name = settings.FEATURE_BIGQUERY_HISTORY_TABLE
        try:
            query = f"""
                SELECT 
                    COUNT(*) as total_loads,
                    COALESCE(SUM(row_count), 0) as total_rows
                FROM `{table_name}`
                WHERE load_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
            """
            
            results = await run_in_threadpool(self.bq_client.query, query)
            
            if results:
                row = results[0]
                return [
                    {"type": "daily_rows", "value": f"{int(row['total_rows']):,}", "subtext": "Rows (24h)"},
                    {"type": "daily_loads", "value": row['total_loads'], "subtext": "Loads (24h)"}
                ]
            return []
        except Exception as e:
            logger.error(f"Error fetching BQ stats: {e}")
            return [{"type": "bq_status", "value": "Error", "subtext": "Check Logs", "status": "error"}]

    async def _set_cache(self, key: str, data: Any, expire: int):
        try:
            await self.redis.setex(key, expire, json.dumps(data))
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")

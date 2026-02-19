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
        Returns top visited pages. Currently mock data.
        """
        return {
            "window_hours": 4,
            "items": [
                {"path": "/tables/sales.orders", "title": "Sales Orders", "count": 150},
                {"path": "/jobs/daily_etl", "title": "Daily ETL", "count": 120},
                {"path": "/users/admin", "title": "Admin User", "count": 89},
            ]
        }

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

import logging
from typing import List, Dict, Any
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class AnalyticsRepository:
    def __init__(self, bq_client: BigQueryClient):
        self.bq_client = bq_client

    async def get_bq_ingestion_stats(self) -> List[Dict[str, Any]]:
        """Fetch ingestion stats from BigQuery"""
        table_name = settings.FEATURE_HISTORY_TABLE
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
                    {
                        "type": "daily_rows",
                        "value": f"{int(row['total_rows']):,}",
                        "subtext": "Rows (24h)",
                    },
                    {
                        "type": "daily_loads",
                        "value": row["total_loads"],
                        "subtext": "Loads (24h)",
                    },
                ]
            return []
        except Exception as e:
            logger.error(f"Error fetching BQ stats: {e}")
            return [{"type": "bq_status", "value": "Error", "status": "error"}]

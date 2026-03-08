import logging
from typing import Any, Dict, List

from google.cloud import bigquery

from app.core.config import settings

logger = logging.getLogger(__name__)


class BigQueryClient:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            # google-cloud library automatically uses GOOGLE_APPLICATION_CREDENTIALS
            self.client = bigquery.Client(project=settings.GOOGLE_PROJECT_ID)
            logger.info(
                f"Initialized BigQuery Client for project: {self.client.project}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize BigQuery Client: {e}")
            self.client = None

    def query(self, query_string: str) -> List[Dict[str, Any]]:
        """
        Executes a query and returns the result as a list of dictionaries.
        """
        if not self.client:
            raise RuntimeError("BigQuery client is not initialized")

        try:
            query_job = self.client.query(query_string)
            rows = query_job.result()  # Waits for job to complete.

            # Convert Row iterator to list of dicts for easier consumption
            results = [dict(row) for row in rows]
            return results
        except Exception as e:
            logger.error(f"BigQuery Query Failed: {e}\nQuery: {query_string}")
            raise

    def insert_rows(self, table_id: str, rows: List[Dict[str, Any]]) -> bool:
        """
        Stream rows into BigQuery.
        """
        if not self.client:
            raise RuntimeError("BigQuery client is not initialized")

        try:
            errors = self.client.insert_rows_json(table_id, rows)
            if errors:
                logger.error(f"Encountered errors while inserting rows: {errors}")
                return False
            logger.debug(f"Successfully inserted {len(rows)} rows into {table_id}")
            return True
        except Exception as e:
            logger.error(f"BigQuery Insert Failed: {e}")
            return False

    def get_recent_job_runs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Queries the job execution history table and returns the most recent runs.
        Sorted by start_date DESC. Table configured via JOB_RUN_HISTORY_TABLE.
        """
        table = settings.JOB_RUN_HISTORY_TABLE
        query = f"""
            SELECT
                job_id,
                dag_id,
                destination,
                issuer,
                cron_schedule,
                period,
                date,
                hour,
                start_time AS execution_time,
                next_start_time,
                publish_time
            FROM `{table}`
            ORDER BY start_time DESC
            LIMIT {limit}
        """
        logger.info(f"Fetching recent job runs from BigQuery table: {table}")
        return self.query(query)

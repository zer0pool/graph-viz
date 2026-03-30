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

    def get_slot_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Returns top-N jobs ranked by yesterday's slot usage (descending).
        Each row: job_id, type, value_yesterday, value_7d_avg, change_pct, history_7d (ARRAY).
        """
        table = settings.BIGQUERY_SLOT_USAGE_TABLE
        query = f"""
            WITH
            date_range AS (
              SELECT
                FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))  AS yesterday,
                FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))  AS since_7d
            ),
            yesterday AS (
              SELECT job_id, type, slot AS slot_yesterday
              FROM `{table}`, date_range
              WHERE date = date_range.yesterday
            ),
            avg7 AS (
              SELECT job_id,
                ROUND(AVG(slot))                          AS slot_7d_avg,
                ARRAY_AGG(slot ORDER BY date ASC)         AS history_7d
              FROM `{table}`, date_range
              WHERE date BETWEEN date_range.since_7d AND date_range.yesterday
              GROUP BY job_id
            )
            SELECT
              y.job_id,
              y.type,
              CAST(y.slot_yesterday AS FLOAT64)                               AS value_yesterday,
              CAST(a.slot_7d_avg    AS FLOAT64)                               AS value_7d_avg,
              ROUND((y.slot_yesterday - a.slot_7d_avg)
                    / NULLIF(a.slot_7d_avg, 0) * 100, 1)                     AS change_pct,
              a.history_7d
            FROM yesterday y
            JOIN avg7 a USING (job_id)
            ORDER BY y.slot_yesterday DESC
            LIMIT {limit}
        """
        logger.info(f"Fetching slot ranking from BigQuery table: {table}")
        rows = self.query(query)
        # Convert ARRAY<INT64> → List[float]
        for r in rows:
            r["history_7d"] = [float(v) for v in (r.get("history_7d") or [])]
        return rows

    def get_duration_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Returns top-N jobs ranked by yesterday's execution duration (descending).
        Each row: job_id, type, value_yesterday, value_7d_avg, change_pct, history_7d (ARRAY).
        """
        table = settings.BIGQUERY_RUNNING_TIME_TABLE
        query = f"""
            WITH
            date_range AS (
              SELECT
                FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))  AS yesterday,
                FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))  AS since_7d
            ),
            daily_duration AS (
              SELECT
                job_id, type, date,
                TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_sec
              FROM `{table}`
            ),
            yesterday AS (
              SELECT job_id, type, duration_sec AS duration_yesterday
              FROM daily_duration, date_range
              WHERE date = date_range.yesterday
            ),
            avg7 AS (
              SELECT job_id,
                ROUND(AVG(duration_sec))                          AS duration_7d_avg,
                ARRAY_AGG(duration_sec ORDER BY date ASC)         AS history_7d
              FROM daily_duration, date_range
              WHERE date BETWEEN date_range.since_7d AND date_range.yesterday
              GROUP BY job_id
            )
            SELECT
              y.job_id,
              y.type,
              CAST(y.duration_yesterday AS FLOAT64)                               AS value_yesterday,
              CAST(a.duration_7d_avg    AS FLOAT64)                               AS value_7d_avg,
              ROUND((y.duration_yesterday - a.duration_7d_avg)
                    / NULLIF(a.duration_7d_avg, 0) * 100, 1)                     AS change_pct,
              a.history_7d
            FROM yesterday y
            JOIN avg7 a USING (job_id)
            ORDER BY y.duration_yesterday DESC
            LIMIT {limit}
        """
        logger.info(f"Fetching duration ranking from BigQuery table: {table}")
        rows = self.query(query)
        for r in rows:
            r["history_7d"] = [float(v) for v in (r.get("history_7d") or [])]
        return rows

    def get_recent_job_runs(self, days: int = 30) -> List[Dict[str, Any]]:
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
            WHERE start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
            ORDER BY start_time DESC
        """
        logger.info(f"Fetching recent job runs from BigQuery table: {table}")
        return self.query(query)

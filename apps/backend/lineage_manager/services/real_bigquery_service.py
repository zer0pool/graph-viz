"""
Real BigQuery Service - Production implementation using google-cloud-bigquery SDK.

This service connects to actual Google Cloud BigQuery and fetches real metadata,
schema, and load history data. It requires valid GCP credentials (ADC or GOOGLE_APPLICATION_CREDENTIALS).
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

try:
    from google.cloud import bigquery
except Exception:  # pragma: no cover - allow module import even without google lib
    bigquery = None


class RealBigQueryService:
    """Production BigQuery service using google-cloud-bigquery SDK.
    
    Responsibilities:
    - Connect to real GCP BigQuery
    - Fetch actual metadata, schema, and load history
    - Use environment credentials (GOOGLE_APPLICATION_CREDENTIALS or ADC)
    
    Prohibited:
    - NO dummy data
    - NO debug redirects
    - NO try/except fallback to dummy data
    - Raise exceptions on errors (let caller handle)
    """

    def __init__(self, history_table: str):
        """Initialize service with history table configuration.
        
        Args:
            history_table: Name of the table containing load history data
        """
        self.history_table = history_table
        self._history_location = None

    def _get_history_location(self, client: "bigquery.Client") -> str:
        """Fetch and cache the location of the history table.
        
        Args:
            client: Authenticated BigQuery client
            
        Returns:
            Location string (e.g., 'US', 'asia-northeast1') or None
        """
        if self._history_location is None:
            try:
                logger.info(f"Detecting location for history table: {self.history_table}")
                table = client.get_table(self.history_table)
                self._history_location = table.location
                logger.info(f"History table location: {self._history_location}")
            except Exception as e:
                logger.warning(f"Could not determine location for {self.history_table}: {e}")
                # Don't set self._history_location to stay None so it can retry or let BQ handle it
                return None
        return self._history_location

    def _ensure_client(self):
        """Create BigQuery client using environment credentials.
        
        Returns:
            bigquery.Client instance
        """
        if bigquery is None:
            raise RuntimeError("google-cloud-bigquery is not installed")
            
        # Extract project ID from history table path if possible
        project_id = None
        parts = self.history_table.split(".")
        if len(parts) >= 1:
            project_id = parts[0]
            
        return bigquery.Client(project=project_id)

    def get_table_schema(self, full_name: str) -> List[Dict[str, Any]]:
        """Fetch the schema (columns) for a BigQuery table.
        
        Args:
            full_name: Fully qualified table name (project.dataset.table)
            
        Returns:
            List of column definitions with name, type, mode, description, etc.
            
        Raises:
            RuntimeError: If BigQuery SDK is not installed
            google.cloud.exceptions.NotFound: If table doesn't exist
        """
        client = self._ensure_client()
        table = client.get_table(full_name)
        schema = getattr(table, "schema", [])
        return [self._field_to_dict(f) for f in schema]

    def _field_to_dict(self, field: "bigquery.schema.SchemaField") -> Dict[str, Any]:
        """Convert BigQuery SchemaField to dictionary.
        
        Args:
            field: BigQuery SchemaField object
            
        Returns:
            Dict representation of the field
        """
        base = {
            "name": field.name,
            "type": field.field_type,
            "mode": field.mode,
            "description": field.description,
        }
        if getattr(field, "field_type", "") == "RECORD":
            # nested fields
            base["fields"] = [
                self._field_to_dict(f) for f in (getattr(field, "fields", None) or [])
            ]
        return base

    def get_table_detail(self, full_name: str) -> Dict[str, Any]:
        """Fetch detailed metadata for a BigQuery table.
        
        Args:
            full_name: Fully qualified table name (project.dataset.table)
            
        Returns:
            Dict containing table metadata including storage, partitioning, clustering, etc.
            
        Raises:
            RuntimeError: If BigQuery SDK is not installed
            google.cloud.exceptions.NotFound: If table doesn't exist
        """
        client = self._ensure_client()
        table = client.get_table(full_name)

        storage = {
            "num_rows": getattr(table, "num_rows", None),
            "num_bytes": getattr(table, "num_bytes", None),
            "partitioning": None,
            "clustering": list(getattr(table, "clustering_fields", []) or []),
            "encryption": getattr(table, "encryption_configuration", None),
        }

        tp = getattr(table, "time_partitioning", None)
        if tp:
            if getattr(tp, "field", None):
                storage["partitioning"] = f"{tp.type}({tp.field})"
            else:
                storage["partitioning"] = getattr(tp, "type", None)

        info = {
            "full_name": f"{table.project}.{table.dataset_id}.{table.table_id}",
            "table_type": "TABLE",
            "description": getattr(table, "description", None),
            "location": getattr(table, "location", None),
            "created": getattr(table, "created", None).isoformat() if getattr(table, "created", None) else None,
            "modified": getattr(table, "modified", None).isoformat() if getattr(table, "modified", None) else None,
            "expires": getattr(table, "expires", None).isoformat() if getattr(table, "expires", None) else None,
            "labels": dict(getattr(table, "labels", {}) or {}),
            "storage": storage,
        }
        return info

    def get_table_timelines_for_table(self, table_name: str, days: int = 7) -> Dict[str, Any]:
        """Fetch timelines data showing load success/failure patterns over time.
        
        Args:
            table_name: Table name to query (project.dataset.table)
            days: Number of days to look back (default: 7)
            
        Returns:
            Dict with daily_summary, hourly_detail, and time_range
            
        Raises:
            RuntimeError: If BigQuery SDK is not installed
        """
        if bigquery is None:
            raise RuntimeError("google-cloud-bigquery is not installed")
        client = self._ensure_client()

        # Parse standard BigQuery id: project.dataset.table
        parts = table_name.split(".")
        if len(parts) == 3:
            project_id, dataset_id, table_id = parts
        else:
            project_id, dataset_id, table_id = ("unknown", "unknown", table_name)
            if len(parts) == 2:
                project_id, dataset_id, table_id = ("unknown", parts[0], parts[1])

        logger.info(f"Fetching timelines for {project_id}.{dataset_id}.{table_id} (days={days})")

        query = (
            "SELECT project_name, dataset_name, table_name, period, cron_schedule, "
            "date, hour, start_time "
            f"FROM `{self.history_table}` "
            "WHERE project_name = @project_id "
            "AND dataset_name = @dataset_id "
            "AND table_name = @table_id "
            "AND start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY) "
            "ORDER BY start_time"
        )

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("project_id", "STRING", project_id),
                bigquery.ScalarQueryParameter("dataset_id", "STRING", dataset_id),
                bigquery.ScalarQueryParameter("table_id", "STRING", table_id),
                bigquery.ScalarQueryParameter("days", "INT64", int(days)),
            ]
        )
        
        location = self._get_history_location(client)
        query_job = client.query(query, job_config=job_config, location=location)
        rows = list(query_job.result())

        from collections import defaultdict
        date_hours = defaultdict(set)
        date_rows = defaultdict(list)
        periods = set()

        for r in rows:
            d = r.get("date")  # Should be date object or string 'YYYY-MM-DD'
            # format date if needed
            if hasattr(d, "isoformat"):
                d_str = d.isoformat()
            else:
                d_str = str(d)
                
            hour = int(r.get("hour") or 0)
            date_hours[d_str].add(hour)
            date_rows[d_str].append(r)
            
            p = r.get("period")
            if p:
                periods.add(str(p).upper())

        # Heuristic for hourly vs daily based on 'period' column
        is_hourly = "HOURLY" in periods

        from datetime import date, timedelta
        today = date.today()
        dates_range = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

        daily_summary = []
        hourly_detail = {}

        for d in dates_range:
            hours = date_hours.get(d, set())
            if is_hourly:
                expected = 24
                success = len(hours)
            else:
                expected = 1
                success = 1 if date_rows.get(d) else 0

            fail = max(0, expected - success)
            rate = round(success / expected, 3) if expected else 0
            status = "good" if rate >= 0.99 else ("warning" if rate >= 0.5 else "bad")

            daily_summary.append(
                {
                    "date": d,
                    "period": "HOURLY" if is_hourly else "DAILY",
                    "success_count": success,
                    "fail_count": fail,
                    "status": status,
                    "rate": rate,
                }
            )

            if is_hourly:
                rows_for_date = []
                for hour in range(24):
                    state = "loaded" if hour in hours else "missing"
                    interval_start = f"{d}T{hour:02d}:00:00Z"
                    interval_end = f"{d}T{hour:02d}:59:59Z"
                    rows_for_date.append({
                        "hour": f"{hour:02d}", 
                        "state": state, 
                        "interval_start": interval_start, 
                        "interval_end": interval_end
                    })
                hourly_detail[d] = rows_for_date

        return {
            "daily_summary": daily_summary, 
            "hourly_detail": hourly_detail,
            "time_range": {
                "start": dates_range[0],  # Oldest
                "end": dates_range[-1],   # Newest (Today)
            }
        }

    def get_table_load_history(self, table_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent load history records for a table.
        
        Args:
            table_name: Table name to query (project.dataset.table)
            limit: Maximum number of records to return (default: 50)
            
        Returns:
            List of load history records with run_id, status, duration, etc.
            
        Raises:
            RuntimeError: If BigQuery SDK is not installed
        """
        client = self._ensure_client()
        
        # Parse standard BigQuery id: project.dataset.table
        parts = table_name.split(".")
        if len(parts) == 3:
            project_id, dataset_id, table_id = parts
        else:
            project_id, dataset_id, table_id = ("unknown", "unknown", table_name)
            if len(parts) == 2:
                project_id, dataset_id, table_id = ("unknown", parts[0], parts[1])

        logger.info(f"Fetching load history for {project_id}.{dataset_id}.{table_id} (limit={limit})")

        query = (
            "SELECT * "
            f"FROM `{self.history_table}` "
            "WHERE project_name = @project_id "
            "AND dataset_name = @dataset_id "
            "AND table_name = @table_id "
            "ORDER BY start_time DESC "
            "LIMIT @limit"
        )
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("project_id", "STRING", project_id),
                bigquery.ScalarQueryParameter("dataset_id", "STRING", dataset_id),
                bigquery.ScalarQueryParameter("table_id", "STRING", table_id),
                bigquery.ScalarQueryParameter("limit", "INT64", limit),
            ]
        )
        
        logger.debug(f"Executing BQ query with params: project={project_id}, dataset={dataset_id}, table={table_id}")
        location = self._get_history_location(client)
        query_job = client.query(query, job_config=job_config, location=location)
        
        results = []
        for row in query_job.result():
            # Convert Row to dict
            item = dict(row)
            # Ensure serialization of datetime objects
            for k, v in item.items():
                if hasattr(v, 'isoformat'):
                    item[k] = v.isoformat()
            
            # Map run_id if not present (UI key)
            if "run_id" not in item:
                item["run_id"] = item.get("data_interval_start") or item.get("start_time")
                
            results.append(item)
            
        logger.info(f"Retrieved {len(results)} load history records for {table_name}")
        return results

    def get_history_table_path(self) -> str:
        """Return the configured path for the history table.
        
        Returns:
            String representing the full table path (project.dataset.table)
        """
        return self.history_table

import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

try:
    from google.cloud import bigquery
except Exception:  # pragma: no cover - allow module import even without google lib
    bigquery = None


def _field_to_dict(field: "bigquery.schema.SchemaField") -> Dict[str, Any]:
    base = {
        "name": field.name,
        "type": field.field_type,
        "mode": field.mode,
        "description": field.description,
    }
    if getattr(field, "field_type", "") == "RECORD":
        # nested fields
        base["fields"] = [
            _field_to_dict(f) for f in (getattr(field, "fields", None) or [])
        ]
    return base


class BigQueryService:
    """Service for fetching BigQuery metadata and simple timeliness summaries.

    Uses `google-cloud-bigquery` when available and when `ENABLE_BIGQUERY` is set in
    environment or via configuration. Otherwise callers can rely on fallback data.
    """

    def __init__(self, history_table:str ):
        # No-op init; client is created on demand. Keep constructor lightweight for DI.
        self.history_table = history_table
        pass

    def _ensure_client(self):
        if bigquery is None:
            raise RuntimeError("google-cloud-bigquery is not installed")
        # Client uses environment credentials (GOOGLE_APPLICATION_CREDENTIALS) or default ADC.
        return bigquery.Client()

    def get_table_schema(self, full_name: str) -> List[Dict[str, Any]]:
        client = self._ensure_client()
        table = client.get_table(full_name)
        schema = getattr(table, "schema", [])
        return [_field_to_dict(f) for f in schema]

    def get_table_detail(self, full_name: str) -> Dict[str, Any]:
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

        # --- DEBUG: FORCE DUMMY DATA ---
        # Randomly choose between DAILY and HOURLY dummy tables for demonstration
        # This block simulates real data by redirecting all queries to our test tables.
        # To disable, simply remove or comment out this block.
        import random
        is_hourly_demo = True # random.choice([True, False])
        if is_hourly_demo:
             # Hourly dummy table
             project_id, dataset_id, table_id = ("demo", "analytics", "hourly_stats")
        else:
             # Daily dummy table
             project_id, dataset_id, table_id = ("demo", "analytics", "daily_report")
        
        logger.info(f"[DEBUG] Redirecting timeline query to dummy table: {project_id}.{dataset_id}.{table_id} (Input was: {table_name})")
        # -------------------------------

        logger.info(f"Fetching timelines for {project_id}.{dataset_id}.{table_id} (days={days})")

        query = (
            "SELECT project_name, dataset_name, table_name, period, cron_schedule, "
            "date, hour, start_time "
            "FROM `gizmopool.test_data.table_load_history` "
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

        query_job = client.query(query, job_config=job_config)
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
        # If 'HOURLY' is in period, treat as hourly.
        # Fallback: check if we see many hours per day?
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
                # If we have any row for the day, success=1, else 0
                success = 1 if date_rows.get(d) else 0

            fail = max(0, expected - success)
            rate = round(success / expected, 3) if expected else 0
            # Simple traffic light logic
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
                    # Construct rough timestamp for visualization
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
        client = self._ensure_client()
        
        # Parse standard BigQuery id: project.dataset.table
        parts = table_name.split(".")
        if len(parts) == 3:
            project_id, dataset_id, table_id = parts
        else:
            # Fallback or error handling; usually assume last part is table, previous is dataset
            # But query requires all 3. If invalid format, return empty or try partial match.
            # Here we assume valid input or handle strictly.
            project_id, dataset_id, table_id = ("unknown", "unknown", table_name)
            if len(parts) == 2:
                project_id, dataset_id, table_id = ("unknown", parts[0], parts[1])

        logger.info(f"Fetching load history for {project_id}.{dataset_id}.{table_id} (limit={limit})")

        query = (
            "SELECT * "
            "FROM `gizmopool.test_data.table_load_history` "
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
        query_job = client.query(query, job_config=job_config)
        
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
                # Use data_interval_start or start_time Aas run_id fallback
                item["run_id"] = item.get("data_interval_start") or item.get("start_time")
                
            results.append(item)
            
        logger.info(f"Retrieved {len(results)} load history records for {table_name}")
        return results

from lineage_manager.core.config import get_settings
# Backwards-compatible module-level helper that instantiates a service when called.
_default_service = BigQueryService(history_table=get_settings().feature_flags.history_table)


def get_table_schema(full_name: str) -> List[Dict[str, Any]]:
    return _default_service.get_table_schema(full_name)


def get_table_detail(full_name: str) -> Dict[str, Any]:
    return _default_service.get_table_detail(full_name)


def get_table_timelines_for_table(table_name: str, days: int = 7) -> Dict[str, Any]:
    return _default_service.get_table_timelines_for_table(table_name, days)

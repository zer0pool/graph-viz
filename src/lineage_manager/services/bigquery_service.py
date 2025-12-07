import os
from typing import List, Dict, Any

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

    def __init__(self):
        # No-op init; client is created on demand. Keep constructor lightweight for DI.
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

        query = (
            "SELECT table_name, data_interval_start, data_interval_end, schedule, "
            "EXTRACT(DATE FROM data_interval_start) AS date, EXTRACT(HOUR FROM data_interval_start) AS hour "
            "FROM `gizmopool.test_data.table_load_history` "
            "WHERE table_name = @table_name "
            "AND data_interval_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY) "
            "ORDER BY data_interval_start"
        )

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("table_name", "STRING", table_name),
                bigquery.ScalarQueryParameter("days", "INT64", int(days)),
            ]
        )

        query_job = client.query(query, job_config=job_config)
        rows = list(query_job.result())

        from collections import defaultdict
        date_hours = defaultdict(set)
        date_rows = defaultdict(list)
        schedules = []

        for r in rows:
            d = r.get("date")
            hour = int(r.get("hour") or 0)
            date_hours[str(d)].add(hour)
            date_rows[str(d)].append(r)
            if r.get("schedule") is not None:
                try:
                    schedules.append(int(r.get("schedule")))
                except Exception:
                    pass

        schedule_val = 24 if 24 in schedules else (schedules[0] if schedules else None)
        is_hourly = schedule_val == 24

        from datetime import date, timedelta
        today = date.today()
        dates = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

        daily_summary = []
        hourly_detail = {}

        for d in dates:
            hours = date_hours.get(d, set())
            if is_hourly:
                expected = 24
                success = len(hours)
            else:
                expected = 1
                success = len(date_rows.get(d, []))

            fail = max(0, expected - success)
            rate = round(success / expected, 3) if expected else 0
            status = "good" if rate >= 0.99 else ("warning" if rate >= 0.5 else "bad")

            daily_summary.append(
                {
                    "date": d,
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
                    rows_for_date.append({"hour": f"{hour:02d}", "state": state, "interval_start": interval_start, "interval_end": interval_end})
                hourly_detail[d] = rows_for_date

        return {"daily_summary": daily_summary, "hourly_detail": hourly_detail}


# Backwards-compatible module-level helper that instantiates a service when called.
_default_service = BigQueryService()


def get_table_schema(full_name: str) -> List[Dict[str, Any]]:
    return _default_service.get_table_schema(full_name)


def get_table_detail(full_name: str) -> Dict[str, Any]:
    return _default_service.get_table_detail(full_name)


def get_table_timelines_for_table(table_name: str, days: int = 7) -> Dict[str, Any]:
    return _default_service.get_table_timelines_for_table(table_name, days)

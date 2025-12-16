"""
Dummy BigQuery Service - Test/Development implementation with deterministic data.

This service provides consistent, realistic test data for local development, testing,
and demo environments. It requires no external dependencies and returns deterministic
responses for predictable testing.
"""

import logging
from typing import List, Dict, Any
from datetime import date, timedelta

logger = logging.getLogger(__name__)


class DummyBigQueryService:
    """Dummy BigQuery service for testing and local development.
    
    Responsibilities:
    - Provide consistent, deterministic test data
    - Support both HOURLY and DAILY period patterns
    - Maintain API contract compatibility with RealBigQueryService
    - No external dependencies (no BigQuery SDK required)
    
    Note:
    - This is NOT a fallback - it's the primary implementation when enable_bigquery=False
    - All responses are deterministic (same input = same output)
    """

    def __init__(self):
        """Initialize dummy service (no configuration needed)."""
        pass

    def get_table_schema(self, full_name: str) -> List[Dict[str, Any]]:
        """Return a realistic dummy schema for testing.
        
        Args:
            full_name: Fully qualified table name (ignored, returns fixed schema)
            
        Returns:
            List of column definitions with realistic types and nested structures
        """
        # Return schema with both simple and RECORD (nested) columns to exercise UI
        return [
            {
                "name": "id",
                "type": "INTEGER",
                "mode": "NULLABLE",
                "description": "Unique identifier",
                "policy_tags": []
            },
            {
                "name": "name",
                "type": "STRING",
                "mode": "NULLABLE",
                "description": "Name field",
                "policy_tags": []
            },
            {
                "name": "created_at",
                "type": "TIMESTAMP",
                "mode": "NULLABLE",
                "description": "Creation timestamp",
                "policy_tags": []
            },
            {
                "name": "metadata",
                "type": "RECORD",
                "mode": "REPEATED",
                "description": "Nested metadata structure",
                "policy_tags": [],
                "fields": [
                    {
                        "name": "source",
                        "type": "STRING",
                        "mode": "NULLABLE",
                        "description": "Data source"
                    },
                    {
                        "name": "score",
                        "type": "INTEGER",
                        "mode": "NULLABLE",
                        "description": "Quality score"
                    },
                ],
            },
            {
                "name": "value",
                "type": "FLOAT",
                "mode": "NULLABLE",
                "description": "Numeric value",
                "policy_tags": []
            },
        ]

    def get_table_detail(self, full_name: str) -> Dict[str, Any]:
        """Return realistic dummy table metadata.
        
        Args:
            full_name: Fully qualified table name (used in response)
            
        Returns:
            Dict containing realistic table metadata
        """
        return {
            "full_name": full_name,
            "table_type": "TABLE",
            "description": "Dummy table for testing and local development",
            "location": "US",
            "created": "2025-01-10T12:00:00+00:00",
            "modified": "2025-12-17T08:00:00+09:00",
            "expires": None,
            "labels": {"env": "dev", "team": "data-platform"},
            "storage": {
                "num_rows": 1000,
                "num_bytes": 102400,
                "partitioning": "DAY",
                "clustering": ["id", "created_at"],
                "encryption": "Google-managed key",
            },
        }

    def get_table_timelines_for_table(self, table_name: str, days: int = 7) -> Dict[str, Any]:
        """Return realistic dummy timeliness data with HOURLY pattern.
        
        Args:
            table_name: Table name (ignored, returns fixed pattern)
            days: Number of days to generate (default: 7)
            
        Returns:
            Dict with daily_summary, hourly_detail, and time_range
        """
        today = date.today()
        dates_range = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]

        daily_summary = []
        hourly_detail = {}

        # Generate HOURLY pattern with realistic success/failure distribution
        for idx, d in enumerate(dates_range):
            # More recent days have better success rates
            success = max(18, 24 - idx)  # 18-24 successful hours
            fail = 24 - success
            rate = round(success / 24, 3)
            
            # Status based on rate
            if rate >= 0.99:
                status = "good"
            elif rate >= 0.75:
                status = "warning"
            else:
                status = "bad"

            daily_summary.append({
                "date": d,
                "period": "HOURLY",
                "success_count": success,
                "fail_count": fail,
                "status": status,
                "rate": rate,
            })

            # Generate hourly detail for each day
            rows_for_date = []
            for hour in range(24):
                # Deterministic pattern: fail on specific hours based on day index
                is_missing = (hour + idx) % 6 == 0  # Every 6th hour fails
                state = "missing" if is_missing else "loaded"
                
                rows_for_date.append({
                    "hour": f"{hour:02d}",
                    "state": state,
                    "interval_start": f"{d}T{hour:02d}:00:00Z",
                    "interval_end": f"{d}T{hour:02d}:59:59Z",
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
        """Return realistic dummy load history records.
        
        Args:
            table_name: Table name (used in response)
            limit: Maximum number of records (default: 50)
            
        Returns:
            List of load history records with realistic patterns
        """
        today = date.today()
        results = []
        
        # Generate records for the last N days (up to limit)
        num_records = min(limit, 10)  # Generate up to 10 records
        
        for i in range(num_records):
            day_offset = i
            run_date = today - timedelta(days=day_offset)
            
            # Deterministic success/failure pattern
            is_success = i % 5 != 0  # Every 5th record fails
            
            record = {
                "run_id": f"{run_date.isoformat()}T08:15:00Z",
                "status": "SUCCESS" if is_success else "FAILED",
                "duration_sec": 120 + (i * 5) if is_success else 30,
                "updated_at": f"{run_date.isoformat()}T08:17:00Z",
                "rows_loaded": 1500 - (i * 10) if is_success else 0,
                "source_job": "JOB_DAILY_LOAD",
                "notes": "Scheduled daily ingestion" if is_success else "Timeout contacting source API",
                "data_interval_start": f"{run_date.isoformat()}T06:00:00Z",
                "data_interval_end": f"{run_date.isoformat()}T08:00:00Z",
                "interval": "06:00–08:00 UTC",
                "project_name": "demo",
                "dataset_name": "analytics",
                "table_name": table_name.split(".")[-1] if "." in table_name else table_name,
                "period": "DAILY",
                "start_time": f"{run_date.isoformat()}T08:15:00Z",
            }
            results.append(record)
        
        logger.info(f"Generated {len(results)} dummy load history records for {table_name}")
        return results

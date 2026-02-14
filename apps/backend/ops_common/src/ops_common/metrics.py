from enum import Enum

class MetricKey(str, Enum):
    """
    Standard keys for metrics shared across the platform.
    Used by metrics-manager for querying and lineage-manager for data production.
    """
    # Summary Metrics
    TOTAL_JOBS = "total_jobs"
    FAILED_JOBS = "failed_jobs"
    SUCCESS_RATE = "success_rate"
    TOTAL_TABLES_UPDATED = "total_tables_updated"

    # Trend Metrics
    JOB_EXECUTION_TREND = "job_execution_trend"
    TABLE_UPDATE_TREND = "table_update_trend"

    # Aggregation Categories
    PROJECT_AGGREGATION = "project_aggregation"
    OWNER_AGGREGATION = "owner_aggregation"
    STATUS_AGGREGATION = "status_aggregation"

    def __str__(self):
        return self.value

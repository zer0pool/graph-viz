from typing import List, Dict, Any
from app.infrastructure.gcp.bigquery import BigQueryClient

class JobExplorerRepository:
    def __init__(self, bq_client: BigQueryClient):
        self.bq = bq_client

    def get_recent_runs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch raw execution data from BigQuery"""
        return self.bq.get_recent_job_runs(limit=limit)

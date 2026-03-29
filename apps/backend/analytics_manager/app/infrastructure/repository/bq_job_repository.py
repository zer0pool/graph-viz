from typing import Any, Dict, List

from app.domain.repository.job_repository import JobExplorerRepository
from app.infrastructure.gcp.bigquery import BigQueryClient


class BigQueryJobExplorerRepository(JobExplorerRepository):
    def __init__(self, bq_client: BigQueryClient):
        self.bq = bq_client

    def get_recent_runs(self, days: int = 30) -> List[Dict[str, Any]]:
        return self.bq.get_recent_job_runs(days=days)

    def get_slot_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return self.bq.get_slot_ranking(limit=limit)

    def get_duration_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return self.bq.get_duration_ranking(limit=limit)

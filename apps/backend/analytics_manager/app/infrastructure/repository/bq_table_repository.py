from typing import Any, Dict, List

from app.domain.repository.table_repository import TableListRepository
from app.infrastructure.gcp.bigquery import BigQueryClient


class BigQueryTableListRepository(TableListRepository):
    def __init__(self, bq_client: BigQueryClient):
        self.bq = bq_client

    def get_table_list(self) -> List[Dict[str, Any]]:
        return self.bq.get_table_list()

    def get_table_size_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return self.bq.get_table_size_ranking(limit=limit)

    def get_table_rows_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        return self.bq.get_table_rows_ranking(limit=limit)

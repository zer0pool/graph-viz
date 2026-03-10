from abc import ABC, abstractmethod
from typing import Any, Dict, List


class AnalyticsRepository(ABC):
    @abstractmethod
    async def get_bq_ingestion_stats(self) -> List[Dict[str, Any]]:
        """Fetch ingestion stats from BigQuery"""
        raise NotImplementedError

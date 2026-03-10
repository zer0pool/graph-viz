from abc import ABC, abstractmethod
from typing import Any, Dict, List


class LineageGateway(ABC):
    @abstractmethod
    async def get_internal_stats(self) -> Dict[str, Any]:
        """Fetch internal stats from Lineage API."""
        raise NotImplementedError

    @abstractmethod
    async def get_jobs_batch(self, job_ids: List[str]) -> Dict[str, Any]:
        """Fetch job metadata in batch from Lineage API."""
        raise NotImplementedError

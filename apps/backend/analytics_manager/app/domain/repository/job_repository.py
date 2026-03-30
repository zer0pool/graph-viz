from abc import ABC, abstractmethod
from typing import Any, Dict, List


class JobExplorerRepository(ABC):
    @abstractmethod
    def get_recent_runs(self, days: int = 30) -> List[Dict[str, Any]]:
        """Fetch raw execution data from repository"""
        raise NotImplementedError

    @abstractmethod
    def get_slot_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Return top-N jobs ranked by 7-day average slot usage."""
        raise NotImplementedError

    @abstractmethod
    def get_duration_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Return top-N jobs ranked by 7-day average execution duration (seconds)."""
        raise NotImplementedError

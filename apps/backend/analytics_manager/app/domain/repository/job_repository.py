from abc import ABC, abstractmethod
from typing import Any, Dict, List


class JobExplorerRepository(ABC):
    @abstractmethod
    def get_recent_runs(self, days: int = 30) -> List[Dict[str, Any]]:
        """Fetch raw execution data from repository"""
        raise NotImplementedError

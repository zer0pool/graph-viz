from abc import ABC, abstractmethod
from typing import Any, Dict, List


class TableListRepository(ABC):
    @abstractmethod
    def get_table_list(self) -> List[Dict[str, Any]]:
        """Fetch raw table metadata rows, sorted by last_modified DESC."""
        raise NotImplementedError

    @abstractmethod
    def get_table_size_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Return top-N tables ranked by yesterday's total size in bytes."""
        raise NotImplementedError

    @abstractmethod
    def get_table_rows_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Return top-N tables ranked by yesterday's rows_written count."""
        raise NotImplementedError

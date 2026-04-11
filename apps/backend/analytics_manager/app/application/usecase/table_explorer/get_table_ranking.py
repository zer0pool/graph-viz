import asyncio
import logging
from typing import Any, Dict, List

from app.domain.repository.table_repository import TableListRepository

logger = logging.getLogger(__name__)


class GetTableRankingUseCase:
    def __init__(self, repo: TableListRepository):
        self.repo = repo

    async def get_size_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        try:
            rows = await asyncio.to_thread(self.repo.get_table_size_ranking, limit)
            logger.info(f"[TableRanking] Size ranking returned {len(rows)} rows")
            return rows
        except Exception as e:
            logger.error(f"[TableRanking] Failed to fetch size ranking: {e}")
            return []

    async def get_rows_ranking(self, limit: int = 30) -> List[Dict[str, Any]]:
        try:
            rows = await asyncio.to_thread(self.repo.get_table_rows_ranking, limit)
            logger.info(f"[TableRanking] Rows written ranking returned {len(rows)} rows")
            return rows
        except Exception as e:
            logger.error(f"[TableRanking] Failed to fetch rows ranking: {e}")
            return []

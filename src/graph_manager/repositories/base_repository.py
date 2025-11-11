import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class BaseRepository:
    def __init__(self, db: Session, table_name: str):
        self.db = db
        self.table_name = table_name

    def clear_all(self):
        """테이블 전체 삭제"""
        logger.info(f"Clearing all data from {self.table_name}")
        self.db.execute(text(f"DELETE FROM {self.table_name}"))
        logger.debug(f"Cleared {self.table_name} table")

    def count_all(self):
        """테이블 전체 행 개수"""
        result = self.db.execute(
            text(f"SELECT COUNT(*) FROM {self.table_name}")
        ).scalar()
        logger.debug(f"Counted {result} rows in {self.table_name}")
        return result

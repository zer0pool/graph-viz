import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class BaseRepository:
    def __init__(self, db: Session, table_or_name: str | type):
        self.db = db
        self.session = db  # Alias for convenience

        if isinstance(table_or_name, str):
            self.table_name = table_or_name
        else:
            # Assume it's a declarative model
            self.table_name = getattr(
                table_or_name, "__tablename__", str(table_or_name)
            )

    def clear_all(self):
        """Delete all data from table using DELETE for safety"""
        logger.info(f"Clearing all data from {self.table_name}")
        # DELETE is safer than TRUNCATE as it doesn't cause metadata locks
        self.db.execute(text(f"DELETE FROM {self.table_name}"))
        logger.debug(f"Deleted all rows from {self.table_name} table")

    def count_all(self):
        """Count all rows in table"""
        result = self.db.execute(
            text(f"SELECT COUNT(*) FROM {self.table_name}")
        ).scalar()
        logger.debug(f"Counted {result} rows in {self.table_name}")
        return result

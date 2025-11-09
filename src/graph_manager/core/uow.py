from sqlalchemy.orm import Session

from graph_manager.repositories.closure_repository import ClosureRepository
from graph_manager.repositories.graph_edge_repository import GraphEdgeRepository
from graph_manager.repositories.job_repository import JobRepository
from graph_manager.repositories.job_table_link_repository import JobTableLinkRepository
from graph_manager.repositories.table_repository import TableRepository


class GraphUnitOfWork:
    """
    Unit of Work pattern for managing database operations within a single transaction.

    This class provides access to all repositories through a single database session,
    ensuring that all operations within a request use the same transaction context.
    """

    def __init__(self, db: Session):
        self.db = db
        self.jobs = JobRepository(db)
        self.tables = TableRepository(db)
        self.job_table_links = JobTableLinkRepository(db)
        self.edges = GraphEdgeRepository(db)
        self.closures = ClosureRepository(db)

    def commit(self):
        """Commit the current transaction."""
        self.db.commit()

    def rollback(self):
        """Rollback the current transaction."""
        self.db.rollback()

    def close(self):
        """Close the database session."""
        self.db.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with automatic commit/rollback."""
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()

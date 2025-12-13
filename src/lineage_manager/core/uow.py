from sqlalchemy.orm import Session

from lineage_manager.repositories.closure_repository import ClosureRepository
from lineage_manager.repositories.graph_edge_repository import GraphEdgeRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.repositories.job_table_link_repository import (
    JobTableLinkRepository,
)
from lineage_manager.repositories.table_repository import TableRepository


class BaseUnitOfWork:
    """Base Unit of Work with common transaction methods."""
    
    def __init__(self, db: Session):
        self.db = db
    
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


class GraphUnitOfWork(BaseUnitOfWork):
    """
    Unit of Work for Graph domain (write operations).
    
    Provides access to graph-related repositories for mutation operations.
    """

    def __init__(self, db: Session):
        super().__init__(db)
        self.jobs = JobRepository(db)
        self.tables = TableRepository(db)
        self.job_table_links = JobTableLinkRepository(db)
        self.edges = GraphEdgeRepository(db)
        self.closures = ClosureRepository(db)


class ReadOnlyUnitOfWork:
    """
    Read-only Unit of Work (no commit/rollback).
    
    Uses autocommit session for read-only queries.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def close(self):
        """Close the database session."""
        self.db.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


class GraphReadOnlyUnitOfWork(ReadOnlyUnitOfWork):
    """Read-only Unit of Work for Graph domain queries."""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.jobs = JobRepository(db)
        self.tables = TableRepository(db)
        self.job_table_links = JobTableLinkRepository(db)
        self.edges = GraphEdgeRepository(db)
        self.closures = ClosureRepository(db)

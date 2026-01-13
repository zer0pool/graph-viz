from sqlalchemy.orm import Session

from lineage_manager.repositories.closure_repository import ClosureRepository
from lineage_manager.repositories.graph_edge_repository import GraphEdgeRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.repositories.job_table_link_repository import (
    JobTableLinkRepository,
)
from lineage_manager.repositories.table_repository import TableRepository
from lineage_manager.repositories.user_repository import UserRepository


class BaseUnitOfWork:
    """
    Base Unit of Work with common transaction methods.
    
    Transaction Policy:
    - Orchestrator services use `with uow.transactional():` 
    - Command services must NOT use context manager (will raise RuntimeError)
    - Query services use ReadOnlyUnitOfWork
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._allow_context = True  # Default: allow context manager
    
    def transactional(self):
        """
        Explicitly mark this UoW as transactional context.
        Only Orchestrator services should call this.
        
        Usage:
            with uow.transactional():
                # operations that will be committed
        """
        # Temporarily re-enable context manager for orchestrators
        class TransactionalContext:
            def __init__(self, uow):
                self.uow = uow
                self._original_allow_context = None
            
            def __enter__(self):
                # Save original state and enable context manager
                self._original_allow_context = getattr(self.uow, '_allow_context', True)
                self.uow._allow_context = True
                return self.uow.__enter__()
            
            def __exit__(self, exc_type, exc_val, exc_tb):
                result = self.uow.__exit__(exc_type, exc_val, exc_tb)
                # Restore original state
                self.uow._allow_context = self._original_allow_context
                return result
        
        return TransactionalContext(self)
    
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
        """Context manager entry - checks if allowed."""
        if not getattr(self, '_allow_context', True):
            raise RuntimeError(
                f"{self.__class__.__name__} context manager is disabled. "
                "This service must not manage transactions. "
                "Use Orchestrator service instead."
            )
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


class UserUnitOfWork(BaseUnitOfWork):
    """
    Unit of Work for User domain.
    """
    def __init__(self, db: Session):
        super().__init__(db)
        self.users = UserRepository(db)
        
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

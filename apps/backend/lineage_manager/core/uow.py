from sqlalchemy.orm import Session

from lineage_manager.repositories.closure_repository import ClosureRepository
from lineage_manager.repositories.graph_edge_repository import GraphEdgeRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.repositories.job_table_link_repository import (
    JobTableLinkRepository,
)
from lineage_manager.repositories.table_repository import TableRepository
from lineage_manager.repositories.user_repository import UserRepository
from lineage_manager.repositories.job_node_repository import JobNodeRepository
from lineage_manager.repositories.data_node_repository import DataNodeRepository
from lineage_manager.repositories.project_repository import ProjectRepository
from lineage_manager.repositories.audit_repository import AuditRepository


class BaseUnitOfWork:
    """
    Base Unit of Work with common transaction methods.
    """

    def __init__(self, db: Session):
        self.db = db
        self._allow_context = True  # Default: allow context manager

    def transactional(self):
        """
        Explicitly mark this UoW as transactional context.
        """

        class TransactionalContext:
            def __init__(self, uow):
                self.uow = uow
                self._original_allow_context = None

            def __enter__(self):
                self._original_allow_context = getattr(self.uow, "_allow_context", True)
                self.uow._allow_context = True
                return self.uow.__enter__()

            def __exit__(self, exc_type, exc_val, exc_tb):
                result = self.uow.__exit__(exc_type, exc_val, exc_tb)
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
        if not getattr(self, "_allow_context", True):
            raise RuntimeError(
                f"{self.__class__.__name__} context manager is disabled."
            )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()


class GraphUnitOfWork(BaseUnitOfWork):
    """
    Unit of Work for Graph domain (write operations).
    """

    def __init__(self, db: Session):
        super().__init__(db)
        # Graph repositories
        self.jobs = JobRepository(db)
        self.tables = TableRepository(db)
        self.job_table_links = JobTableLinkRepository(db)
        self.edges = GraphEdgeRepository(db)
        self.closures = ClosureRepository(db)

        # Search & Metadata repositories (Catalog)
        self.job_node = JobNodeRepository(db)
        self.data_node = DataNodeRepository(db)
        self.project = ProjectRepository(db)
        self.users = UserRepository(db)


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
    """

    def __init__(self, db: Session):
        self.db = db

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
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

        # Search repositories
        self.job_node = JobNodeRepository(db)
        self.data_node = DataNodeRepository(db)
        self.project = ProjectRepository(db)
        self.users = UserRepository(db)

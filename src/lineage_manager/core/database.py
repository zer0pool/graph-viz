import logging
from contextlib import AbstractContextManager, contextmanager
from typing import Dict

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, scoped_session, sessionmaker

# Ensure models are imported so tables are registered on Base.metadata
from ..models import graph_closure, graph_edge, graph_node
from ..models.base import Base
from .config import get_settings

logger = logging.getLogger(__name__)


class Database:
    def __init__(self) -> None:
        settings = get_settings()

        # Database connection arguments based on database type
        connect_args = {
            "charset": "utf8mb4",
        }

        # Engine settings
        engine_kwargs = {
            "echo": settings.mysql.echo,
            "future": True,
        }

        # Improve connection resiliency for server DBs
        engine_kwargs.update(
            {
                "pool_pre_ping": True,
                "pool_recycle": 1800,
                "pool_size": settings.mysql.pool_size,
                "max_overflow": settings.mysql.max_overflow,
            }
        )

        self._engine = create_engine(
            settings.database_url, connect_args=connect_args, **engine_kwargs
        )
        self._session_factory = scoped_session(
            sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._engine,
                future=True,
            )
        )

    @property
    def session_factory(self) -> sessionmaker:
        return self._session_factory
    
    @property
    def write_session_factory(self) -> sessionmaker:
        """Session factory for write operations (currently same as session_factory)."""
        return self._session_factory
    
    @property
    def read_session_factory(self) -> sessionmaker:
        """Session factory for read operations (currently same as session_factory)."""
        return self._session_factory

    @contextmanager
    def session(self) -> AbstractContextManager[Session]:
        """
        Provides a transactional scope for a session.
        The session is committed or rolled back by the using code (e.g., repository).
        """
        session: Session = self._session_factory()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_database(self) -> None:
        if self._engine:
            logger.info("Creating database tables if they don't exist.")
            Base.metadata.create_all(self._engine)
        else:
            logger.warning("Engine not initialized when calling create_database.")

    def test_connection(self) -> bool:
        """Test the database connection"""
        try:
            from sqlalchemy import text

            with self._engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False


# Global database instance
db = Database()

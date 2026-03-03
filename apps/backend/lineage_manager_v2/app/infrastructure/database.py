from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def create_session_factory(db_url: str):
    engine = create_async_engine(db_url, echo=False, future=True, pool_pre_ping=True)
    return async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )


# Default Session Local for API (initialized with default settings)
_engine = create_async_engine(
    settings.DATABASE_URL, echo=False, future=True, pool_pre_ping=True
)
AsyncSessionLocal = async_sessionmaker(
    bind=_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async session in FastAPI endpoints."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

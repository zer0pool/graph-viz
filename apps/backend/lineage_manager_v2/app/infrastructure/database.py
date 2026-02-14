
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings
from typing import AsyncGenerator

# Create Async Engine
# Using pool_pre_ping to handle dropped connections
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True
)

# Create Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

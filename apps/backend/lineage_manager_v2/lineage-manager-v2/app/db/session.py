from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# Create Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # Set to False in production
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

async def get_db() -> AsyncSession:
    """Dependency for getting async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

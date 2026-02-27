from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

def create_session_factory(db_url: str):
    engine = create_async_engine(
        db_url,
        pool_pre_ping=True,
    )
    return async_sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        class_=AsyncSession,
    )

from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
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

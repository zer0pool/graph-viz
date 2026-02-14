import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    print(f"Testing connection to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"DB result: {result.scalar()}")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

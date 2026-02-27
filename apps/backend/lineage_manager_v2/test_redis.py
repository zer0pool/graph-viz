import asyncio
import redis.asyncio as redis
from app.core.config import settings

async def main():
    print(f"Testing connection to: {settings.REDIS_URL}")
    client = redis.from_url(settings.REDIS_URL)
    try:
        response = await client.ping()
        print(f"Ping result: {response}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())

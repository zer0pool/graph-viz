from redis.asyncio import Redis, from_url
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

async def get_redis_client() -> Redis:
    try:
        redis_client = from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()  # type: ignore
        logger.info(f"Connected to Redis: {settings.REDIS_URL}")
        return redis_client
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        raise


import redis.asyncio as redis
import logging
from app.core.config import settings

logger = logging.getLogger("lineage_manager.redis")

# Initialize Redis Client
print(f"[REDIS] Connecting to {settings.REDIS_HOST}:{settings.REDIS_PORT} (URL: {settings.REDIS_URL})")
logger.info(f"Connecting to Redis at: {settings.REDIS_HOST}:{settings.REDIS_PORT} (DB={settings.REDIS_DB})")

redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    socket_timeout=2.0 
)

async def check_redis() -> bool:
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis Connection Failed: {e} (URL={settings.REDIS_URL})")
        return False

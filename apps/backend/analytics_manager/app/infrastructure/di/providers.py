from typing import AsyncGenerator

from redis.asyncio import Redis

from app.infrastructure.cache.redis import get_redis_client
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.infrastructure.gcp.client import GoogleCloudClient
from app.infrastructure.lineage_client import LineageClient

# Global singletons
_bz_client = BigQueryClient()
_google_client = GoogleCloudClient()
_lineage_client = LineageClient()


async def get_redis() -> AsyncGenerator[Redis, None]:
    """Provides an async Redis client from the pool."""
    client = await get_redis_client()
    try:
        yield client
    finally:
        pass  # Redis client pool handles connections


async def get_bq_client() -> BigQueryClient:
    return _bz_client


async def get_lineage_client() -> LineageClient:
    return _lineage_client

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime

import redis.asyncio as aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings

logger = logging.getLogger("analytics_manager.access_log")

SERVICE_NAME = "analytics"
REDIS_KEY = f"api:access:log:{SERVICE_NAME}"
SKIP_PATHS = {"/health", "/metrics"}

# Uses CELERY_BROKER_URL (DB 0) so lineage_manager_v2 Celery task can read both buffers
_redis_client = aioredis.from_url(
    settings.CELERY_BROKER_URL, encoding="utf-8", decode_responses=True, socket_timeout=2.0
)

_push_script = None


def _get_push_script():
    global _push_script
    if _push_script is None:
        _push_script = _redis_client.register_script("""
            redis.call('LPUSH', KEYS[1], ARGV[1])
            redis.call('LTRIM', KEYS[1], 0, 9999)
            return 1
        """)
    return _push_script


async def _push_log_entry(entry: dict) -> None:
    try:
        script = _get_push_script()
        await script(keys=[REDIS_KEY], args=[json.dumps(entry)])
    except Exception as e:
        logger.warning(f"[AccessLog] Failed to push log entry to Redis: {e}")


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        response = await call_next(request)

        if request.url.path in SKIP_PATHS:
            return response

        duration_ms = int((time.monotonic() - start) * 1000)
        user = request.session.get("user", {})

        entry = {
            "request_id": request_id,
            "user_id": user.get("user_id") if user else None,
            "service": SERVICE_NAME,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "ip_address": request.client.host if request.client else None,
            "requested_at": datetime.utcnow().isoformat(),
        }

        asyncio.create_task(_push_log_entry(entry))
        response.headers["X-Request-ID"] = request_id
        return response

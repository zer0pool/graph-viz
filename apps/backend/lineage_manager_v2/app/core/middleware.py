import asyncio
import json
import logging
import time
import uuid
from datetime import datetime

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.infrastructure.redis import redis_client

logger = logging.getLogger("lineage_manager.access_log")

SERVICE_NAME = "lineage"
REDIS_KEY = f"api:access:log:{SERVICE_NAME}"
SKIP_PATHS = {"/health", "/metrics"}

_push_script = None


def _get_push_script():
    global _push_script
    if _push_script is None:
        _push_script = redis_client.register_script("""
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
        user = request.session.get("user", {}) if hasattr(request, "session") else {}

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

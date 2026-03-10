import json
import logging
from datetime import datetime, timezone

from redis.asyncio import Redis

from app.domain.entity.analytics import TrackEvent

logger = logging.getLogger(__name__)


class TrackEventUseCase:
    """Use Case to record analytics events to the cache/queue."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def execute(self, event: TrackEvent) -> bool:
        queue_key = "analytics:raw_events"
        try:
            event_data = event.model_dump()
            ts = event_data.get("timestamp")
            event_data["timestamp"] = (
                ts.isoformat()
                if isinstance(ts, datetime)
                else datetime.now(timezone.utc).isoformat()
            )
            await self.redis.lpush(queue_key, json.dumps(event_data))  # type: ignore
            return True
        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            return False

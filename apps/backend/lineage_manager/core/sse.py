import asyncio
import json
from typing import AsyncGenerator, Dict, List, Optional

from lineage_manager.core.config import get_settings


class SSEBroker:
    """Simple in-memory SSE broker with replay + basic stats."""

    def __init__(self, history_size: int = 100) -> None:
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._history_size = max(1, history_size)
        self._history: List[dict[str, str | int]] = []
        self._last_event_id = 0
        self._lock = asyncio.Lock()

    async def publish(self, event: str, data: Dict) -> None:
        """Broadcast a new event to subscribers and record it for replay."""
        async with self._lock:
            self._last_event_id += 1
            event_id = self._last_event_id
            payload = self._format_payload(event_id, event, data)
            self._history.append({"id": event_id, "payload": payload})
            if len(self._history) > self._history_size:
                self._history.pop(0)

        for q in list(self._subscribers):
            try:
                await q.put(payload)
            except Exception:
                self._subscribers.discard(q)

    async def subscribe(
        self, last_event_id: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """Yield events, replaying buffered ones if requested."""
        q: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers.add(q)
        try:
            await q.put(": ping\n\n")
            # Replay missed events if caller provided a cursor
            if last_event_id is not None:
                for item in self._replay_from(last_event_id):
                    await q.put(item["payload"])

            while True:
                chunk = await q.get()
                yield chunk
        finally:
            self._subscribers.discard(q)

    def snapshot(self) -> Dict[str, int]:
        """Return broker state useful for health checks."""
        return {
            "last_event_id": self._last_event_id,
            "buffer_size": self._history_size,
            "cached_events": len(self._history),
        }

    def _replay_from(self, last_event_id: int) -> List[dict[str, str | int]]:
        """Return buffered events after the provided id."""
        if not self._history:
            return []
        return [item for item in self._history if item["id"] > last_event_id]

    @staticmethod
    def _format_payload(event_id: int, event: str, data: Dict) -> str:
        return (
            f"id: {event_id}\n"
            f"event: {event}\n"
            f"data: {json.dumps(data, separators=(',', ':'))}\n\n"
        )


_settings = get_settings()
broker = SSEBroker(history_size=_settings.sse.buffer_size)

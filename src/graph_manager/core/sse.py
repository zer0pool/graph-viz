import asyncio
import json
from collections import deque
from typing import AsyncGenerator, Deque, Dict, Tuple

from graph_manager.core.config import get_settings


class SSEBroker:
    def __init__(self, buffer_size: int = 512) -> None:
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._buffer: Deque[Tuple[int, str]] = deque(maxlen=buffer_size)
        self._buffer_size = buffer_size
        self._last_event_id = 0
        self._lock = asyncio.Lock()

    @property
    def last_event_id(self) -> int:
        return self._last_event_id

    async def publish(self, event: str, data: Dict) -> None:
        async with self._lock:
            self._last_event_id += 1
            event_id = self._last_event_id
            chunk = self._format_chunk(event_id, event, data)
            self._buffer.append((event_id, chunk))
        await self._fanout(chunk)

    async def _fanout(self, chunk: str) -> None:
        for q in list(self._subscribers):
            try:
                await q.put(chunk)
            except Exception:
                self._subscribers.discard(q)

    def _format_chunk(self, event_id: int, event: str, data: Dict) -> str:
        return f"id: {event_id}\nevent: {event}\ndata: {json.dumps(data)}\n\n"

    def _format_control_event(self, event: str, data: Dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    async def subscribe(self, last_event_id: int | None = None) -> AsyncGenerator[str, None]:
        q: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers.add(q)
        try:
            await q.put(": ping\n\n")
            if last_event_id is not None:
                replayed = False
                for event_id, chunk in list(self._buffer):
                    if event_id > last_event_id:
                        await q.put(chunk)
                        replayed = True
                if not replayed and self._buffer and last_event_id < self._buffer[0][0]:
                    await q.put(
                        self._format_control_event(
                            "replay_unavailable",
                            {
                                "requested": last_event_id,
                                "available_from": self._buffer[0][0],
                                "last_event_id": self._last_event_id,
                            },
                        )
                    )
            while True:
                chunk = await q.get()
                yield chunk
        finally:
            self._subscribers.discard(q)

    def snapshot(self) -> Dict[str, int]:
        return {
            "last_event_id": self._last_event_id,
            "buffer_size": self._buffer_size,
            "cached_events": len(self._buffer),
        }


settings = get_settings()
broker = SSEBroker(buffer_size=settings.sse_buffer_size)

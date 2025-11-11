import asyncio
import json
from typing import AsyncGenerator, Dict


class SSEBroker:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[str]] = set()

    async def publish(self, event: str, data: Dict) -> None:
        payload = f"event: {event}\n" f"data: {json.dumps(data)}\n\n"
        for q in list(self._subscribers):
            try:
                await q.put(payload)
            except Exception:
                self._subscribers.discard(q)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        q: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers.add(q)
        try:
            # Initial ping to keep connection open
            await q.put(": ping\n\n")
            while True:
                chunk = await q.get()
                yield chunk
        finally:
            self._subscribers.discard(q)


broker = SSEBroker()


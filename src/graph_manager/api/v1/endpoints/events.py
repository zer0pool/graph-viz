import asyncio

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from graph_manager.core.sse import broker

router = APIRouter(prefix="/api/v1/events", tags=["events"])


@router.get("/trigger-status")
@inject
async def stream_trigger_status():
    async def event_generator():
        async for payload in broker.subscribe():
            yield payload

    return StreamingResponse(event_generator(), media_type="text/event-stream")


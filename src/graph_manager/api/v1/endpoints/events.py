import json
from datetime import datetime
from hashlib import sha1

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from graph_manager.core.auth import require_authenticated_user
from graph_manager.core.config import get_settings
from graph_manager.core.container import GraphContainer
from graph_manager.core.sse import broker
from graph_manager.services.graph_query_service import GraphQueryService

settings = get_settings()

router = APIRouter(
    prefix="/api/v1/events",
    tags=["events"],
    dependencies=[Depends(require_authenticated_user)],
)


@router.get("/trigger-status")
@inject
async def stream_trigger_status(last_event_id: int | None = Query(default=None, alias="lastEventId")):
    async def event_generator():
        async for payload in broker.subscribe(last_event_id):
            yield payload

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/state-hash")
@inject
def get_state_hash(
    graph_service: GraphQueryService = Depends(Provide[GraphContainer.graph_query_service]),
):
    stats = graph_service.get_health_stats()
    snapshot = broker.snapshot()
    baseline = {"stats": stats, "last_event_id": snapshot["last_event_id"]}
    payload = {
        "stats": stats,
        "last_event_id": snapshot["last_event_id"],
        "buffer_size": snapshot["buffer_size"],
        "cached_events": snapshot["cached_events"],
        "poll_interval_ms": settings.event_poll_interval_ms,
        "timestamp": datetime.utcnow().isoformat(),
        "hash": sha1(json.dumps(baseline, sort_keys=True).encode()).hexdigest(),
    }
    return payload

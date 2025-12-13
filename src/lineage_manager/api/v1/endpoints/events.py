import json
from copy import deepcopy
from datetime import datetime
from hashlib import sha1

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.config import get_settings
from lineage_manager.core.container import GraphContainer
from lineage_manager.core.sse import broker
from lineage_manager.services.graph_query_service import GraphQueryService

settings = get_settings()

AUTH_DEPS = [Depends(require_authenticated_user)] if is_auth_enabled() else []

router = APIRouter(
    prefix="/api/v1/events",
    tags=["events"],
    # dependencies=AUTH_DEPS,  # Disabled for embedded mode POC
)

def _sanitize_stats_for_hash(stats: dict) -> dict:
    cleaned = deepcopy(stats)
    database = cleaned.get("database")
    if isinstance(database, dict) and "timestamp" in database:
        database.pop("timestamp", None)
    return cleaned


@router.get("/trigger-status")
@inject
async def stream_trigger_status(
    last_event_id: int | None = Query(default=None, alias="lastEventId")
):
    async def event_generator():
        async for payload in broker.subscribe(last_event_id):
            yield payload

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/state-hash")
@inject
def get_state_hash(
    graph_service: GraphQueryService = Depends(
        Provide[GraphContainer.graph.query_service]
    ),
):
    stats = graph_service.get_health_stats()
    snapshot = broker.snapshot()
    baseline = {
        "stats": _sanitize_stats_for_hash(stats),
        "last_event_id": snapshot["last_event_id"],
    }
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

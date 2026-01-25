from datetime import datetime, timedelta
from typing import List, Literal

from fastapi import APIRouter, Query

from lineage_manager.api.v1.schemas import AuditCommand, AuditEvent

router = APIRouter(
    prefix="/api/v1/audit",
    tags=["audit"],
)


def _generate_dummy_data(days: int) -> List[AuditCommand]:
    now = datetime.now()
    commands = []

    # Base dataset from Figma example (approximate timestamps relative to now)
    base_data = [
        {
            "id": "cmd-001",
            "delta_minutes": 10,
            "type": "COMMAND",
            "summary": "Disable Dependency (10 jobs)",
            "actor": "admin@team",
            "status": "PARTIAL",
            "incidentId": "#421",
            "events": [
                {"id": "evt-001", "description": "jobA dependency updated", "status": "SUCCESS", "delta_seconds": 5},
                {"id": "evt-002", "description": "jobB dependency updated", "status": "SUCCESS", "delta_seconds": 12},
                {"id": "evt-003", "description": "jobC redeploy timeout", "status": "TIMEOUT", "delta_seconds": 45},
                {"id": "evt-004", "description": "jobD dependency updated", "status": "SUCCESS", "delta_seconds": 61},
                {"id": "evt-005", "description": "jobE dependency updated", "status": "SUCCESS", "delta_seconds": 68},
            ],
        },
        {
            "id": "cmd-002",
            "delta_minutes": 35,
            "type": "COMMAND",
            "summary": "Stop Downstream Jobs (5)",
            "actor": "admin@team",
            "status": "SUCCESS",
            "relatedInfo": "table A corruption",
            "events": [
                {"id": "evt-006", "description": "job_downstream_1 stopped", "status": "SUCCESS", "delta_seconds": 10},
                {"id": "evt-007", "description": "job_downstream_2 stopped", "status": "SUCCESS", "delta_seconds": 15},
                {"id": "evt-008", "description": "job_downstream_3 stopped", "status": "SUCCESS", "delta_seconds": 20},
            ],
        },
        {
            "id": "cmd-003",
            "delta_minutes": 120,
            "type": "COMMAND",
            "summary": "Force Rerun Pipeline (analytics_daily)",
            "actor": "operator@team",
            "status": "SUCCESS",
            "incidentId": "#418",
            "events": [
                {"id": "evt-011", "description": "Pipeline state reset", "status": "SUCCESS", "delta_seconds": 5},
                {"id": "evt-013", "description": "Pipeline execution started", "status": "SUCCESS", "delta_seconds": 20},
            ],
        },
        {
            "id": "cmd-004",
            "delta_minutes": 180,
            "type": "COMMAND",
            "summary": "Backfill Data Range (2026-01-10 to 2026-01-15)",
            "actor": "developer@team",
            "status": "FAILED",
            "relatedInfo": "insufficient quota",
            "events": [
                {"id": "evt-016", "description": "BigQuery quota exceeded", "status": "FAILED", "delta_seconds": 32},
            ],
        },
    ]

    # Extend data if days > 1
    if days > 1:
        # Add some older dummy entries
        for i in range(1, days):
            base_data.append({
                "id": f"cmd-history-{i}",
                "delta_minutes": i * 1440 + 60, # i days ago + 1 hour
                "type": "COMMAND",
                "summary": f"Automated Maintenance Task - Day {i}",
                "actor": "system",
                "status": "SUCCESS",
                "events": [
                    {"id": f"evt-hist-{i}-1", "description": "Maintenance started", "status": "SUCCESS", "delta_seconds": 0},
                    {"id": f"evt-hist-{i}-2", "description": "Maintenance completed", "status": "SUCCESS", "delta_seconds": 120},
                ],
            })

    for item in base_data:
        cmd_time = now - timedelta(minutes=item["delta_minutes"]) # type: ignore
        timestamp_str = cmd_time.strftime("%Y-%m-%d %H:%M")
        
        events = []
        for evt in item["events"]: # type: ignore
            evt_time = cmd_time + timedelta(seconds=evt["delta_seconds"]) # type: ignore
            events.append(AuditEvent(
                id=evt["id"], # type: ignore
                description=evt["description"], # type: ignore
                status=evt["status"], # type: ignore
                timestamp=evt_time.strftime("%H:%M:%S")
            ))

        commands.append(AuditCommand(
            id=item["id"], # type: ignore
            timestamp=timestamp_str,
            type=item["type"], # type: ignore
            summary=item["summary"], # type: ignore
            actor=item["actor"], # type: ignore
            status=item["status"], # type: ignore
            incidentId=item.get("incidentId"), # type: ignore
            relatedInfo=item.get("relatedInfo"), # type: ignore
            events=events
        ))

    return commands


@router.get("/commands", response_model=List[AuditCommand])
async def get_audit_commands(
    range: Literal["24h", "7d", "30d"] = Query(default="24h", description="Time range filter")
):
    days_map = {"24h": 1, "7d": 7, "30d": 30}
    days = days_map.get(range, 1)
    return _generate_dummy_data(days)

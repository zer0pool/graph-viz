import json
import logging
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from lineage_manager.models.audit_log import AuditLog
from lineage_manager.repositories.audit_repository import AuditRepository

logger = logging.getLogger(__name__)


class AuditService:
    """
    Independent service for audit logging.
    Uses its own session management, separate from Graph domain.
    """

    def __init__(self, db):
        self.session_factory = db

    def log_command(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str = "SUCCESS",
        payload: Dict[str, Any] = None,
        error_message: str = None
    ) -> AuditLog:
        """Log a command execution."""
        with self.session_factory() as session:
            try:
                repository = AuditRepository(session)
                log_entry = repository.log_command(
                    command_type=command_type,
                    target_id=target_id,
                    performed_by=performed_by,
                    status=status,
                    payload=payload,
                    error_message=error_message
                )
                session.commit()
                return log_entry
            except Exception as e:
                logger.error(f"Failed to log audit: {e}")
                session.rollback()
                raise

    def list_commands(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        List audit commands in format expected by frontend.
        Maps AuditLog to AuditCommand interface.
        """
        with self.session_factory() as session:
            repository = AuditRepository(session)
            logs = repository.list_logs(limit=limit, offset=offset)
            
            commands = []
            for log in logs:
                # Generate summary from command type and target
                summary = self._generate_summary(log.command_type, log.target_id, log.payload)
                
                # Create single event from log entry
                events = [{
                    "id": f"{log.id}-event-1",
                    "description": summary,
                    "status": log.status if log.status != "PARTIAL" else "SUCCESS",
                    "timestamp": log.visited_at.strftime("%H:%M:%S")
                }]
                
                # Add error event if failed
                if log.status == "FAILURE" and log.error_message:
                    events.append({
                        "id": f"{log.id}-event-error",
                        "description": f"Error: {log.error_message}",
                        "status": "FAILED",
                        "timestamp": log.visited_at.strftime("%H:%M:%S")
                    })
                
                commands.append({
                    "id": str(log.id),
                    "timestamp": log.visited_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "type": log.command_type,
                    "summary": summary,
                    "actor": log.performed_by,
                    "status": log.status,
                    "events": events
                })
            
            return commands

    def _generate_summary(self, command_type: str, target_id: str, payload_json: str) -> str:
        """Generate human-readable summary from command details."""
        payload = {}
        if payload_json:
            try:
                payload = json.loads(payload_json)
            except:
                pass
        
        summaries = {
            "PAUSE_JOB": f"Paused job '{target_id}'",
            "RESUME_JOB": f"Resumed job '{target_id}'",
            "SEND_EMAIL": f"Sent email notification for job '{target_id}'",
            "SYNC_JOB": f"Synchronized job '{target_id}' from source",
        }
        
        return summaries.get(command_type, f"{command_type} on {target_id}")

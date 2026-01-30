import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import desc

from lineage_manager.models.audit_log import AuditLog
from lineage_manager.repositories.base_repository import BaseRepository


class AuditRepository(BaseRepository):
    """Repository for audit logs."""

    def __init__(self, session):
        super().__init__(session, AuditLog)

    def log_command(
        self,
        command_type: str,
        target_id: str,
        performed_by: str,
        status: str = "SUCCESS",
        payload: Dict[str, Any] = None,
        error_message: str = None,
    ) -> AuditLog:
        """Create a new audit log entry."""
        log_entry = AuditLog(
            command_type=command_type,
            target_id=target_id,
            performed_by=performed_by,
            status=status,
            payload=json.dumps(payload) if payload else None,
            error_message=error_message,
            visited_at=datetime.utcnow(),
        )
        self.session.add(log_entry)
        self.session.flush()
        return log_entry

    def list_logs(self, limit: int = 50, offset: int = 0) -> List[AuditLog]:
        """List audit logs ordered by time desc."""
        return (
            self.session.query(AuditLog)
            .order_by(desc(AuditLog.visited_at))
            .limit(limit)
            .offset(offset)
            .all()
        )

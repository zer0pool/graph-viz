import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from lineage_manager.core.auth import serialize_user
from lineage_manager.core.uow import UserUnitOfWork, GraphUnitOfWork
from lineage_manager.models import UserAccount

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, uow: UserUnitOfWork, graph_uow: GraphUnitOfWork = None):
        self.uow = uow
        self.graph_uow = graph_uow  # For job queries

    def record_login(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update the user profile whenever a login succeeds."""
        with self.uow:
            user = self.uow.users.upsert_from_claims(claims)
            return serialize_user(claims, user)

    def get_profile(self, sub: str, job_limit: int = 10) -> Optional[Dict[str, Any]]:
        """Return the persisted user profile plus recent jobs they own."""
        user = self.uow.users.get_by_sub(sub)
        if not user:
            return None

        return {
            "user": {
                "sub": user.sub,
                "name": user.name,
                "email": user.email,
                "roles": user.roles or [],
                "department": user.department,
                "last_login_at": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
            },
        }

    def list_users(self, q: str = None, limit: int = 10, offset: int = 0) -> Dict:
        """List users from catalog."""
        query = self.uow.users.session.query(UserAccount)

        if q:
            from sqlalchemy import or_

            pattern = f"%{q.lower()}%"
            query = query.filter(
                or_(
                    UserAccount.name.ilike(pattern),
                    UserAccount.email.ilike(pattern),
                    UserAccount.user_id.ilike(pattern),
                    UserAccount.department.ilike(pattern),
                )
            )

        total = query.count()
        users = query.order_by(UserAccount.name).limit(limit).offset(offset).all()

        return {
            "users": [
                {
                    "user_id": u.user_id,
                    "name": u.name,
                    "email": u.email,
                    "department": u.department,
                    "status": u.status,
                }
                for u in users
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    def get_user_detail(self, user_id: str) -> Dict:
        """Get user detail with summary statistics."""
        user = self.uow.users.get_catalog_user(user_id)
        if not user:
            # Create a placeholder user if requested but not found in catalog
            user = self.uow.users.create_or_update_catalog_user(
                user_id=user_id, name=user_id.split("@")[0].replace(".", " ").title()
            )

        # Get statistics (owned jobs)
        stats = {"owned_jobs": 0}
        if self.graph_uow:
            stats = self.graph_uow.job_node.get_owner_stats(user_id)

        return {
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "name": user.name,
                "department": user.department,
                "status": user.status,
            },
            "summary": {
                **stats,
                "project_count": len(self.uow.users.list_user_projects(user_id)),
            },
        }

    def get_user_jobs(self, user_id: str, limit: int = 20, offset: int = 0) -> Dict:
        """
        List jobs owned by a user.

        Args:
            user_id: User identifier
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            Jobs list with pagination info
        """
        if not self.graph_uow:
            logger.warning("GraphUnitOfWork not available for job queries")
            return {"jobs": [], "total": 0, "limit": limit, "offset": offset}

        results, total = self.graph_uow.job_node.find_by_owner(user_id, limit, offset)

        jobs = [self._format_job(node, meta) for node, meta in results]

        return {"jobs": jobs, "total": total, "limit": limit, "offset": offset}

    def get_user_projects(self, user_id: str) -> Dict:
        """List projects a user belongs to."""
        projects = self.uow.users.list_user_projects(user_id)

        return {
            "projects": [
                {
                    "project_id": p.project_id,
                    "display_name": p.display_name,
                    "status": p.status,
                }
                for p in projects
            ],
            "total": len(projects),
        }

    def _format_job(self, node, meta) -> Dict:
        """Format job for API response."""
        properties = meta.properties or {}

        return {
            "job_id": node.name,
            "node_id": node.id,
            "running_status": properties.get("status", "unknown"),
            "owner": meta.owner_id,
            "job_name": properties.get("display_name", node.name),
            "enabled": properties.get("enabled", True),
        }

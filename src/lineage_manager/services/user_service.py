from typing import Any, Dict, List, Optional

from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models import GraphUserAccount


class UserService:
    def __init__(self, uow: GraphUnitOfWork):
        self.uow = uow

    def record_login(self, claims: Dict[str, Any]) -> GraphUserAccount:
        """Create or update the user profile whenever a login succeeds."""
        return self.uow.users.upsert_from_claims(claims)

    def get_profile(self, sub: str, job_limit: int = 10) -> Optional[Dict[str, Any]]:
        """Return the persisted user profile plus recent jobs they own."""
        user = self.uow.users.get_by_sub(sub)
        if not user:
            return None

        owner_key = user.email or user.preferred_username or user.sub
        jobs = []
        if owner_key:
            jobs = self.uow.jobs.list_by_owner(owner_key, limit=job_limit)

        serialized_jobs = [
            {
                "job_id": job.job_id,
                "name": job.name,
                "owner": job.owner,
                "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            }
            for job in jobs
        ]

        return {
            "user": {
                "sub": user.sub,
                "name": user.name,
                "email": user.email,
                "picture": user.picture,
                "preferred_username": user.preferred_username,
                "roles": user.roles or [],
                "dept": user.dept,
                "locale": user.locale,
                "last_login_at": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
            },
            "jobs": serialized_jobs,
            "jobs_count": len(serialized_jobs),
        }

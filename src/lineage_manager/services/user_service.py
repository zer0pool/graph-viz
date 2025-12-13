from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from lineage_manager.repositories.user_repository import UserRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.core.auth import serialize_user
from lineage_manager.models import GraphUserAccount


class UserService:
    def __init__(
        self,
        user_repository: UserRepository,
        job_repository: JobRepository,
        session: Session,
    ):
        self.users = user_repository
        self.jobs = job_repository
        self.session = session

    def record_login(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update the user profile whenever a login succeeds."""
        user = self.users.upsert_from_claims(claims)
        self.session.commit()
        return serialize_user(claims, user)

    def get_profile(self, sub: str, job_limit: int = 10) -> Optional[Dict[str, Any]]:
        """Return the persisted user profile plus recent jobs they own."""
        user = self.users.get_by_sub(sub)
        if not user:
            return None

        owner_key = user.email or user.preferred_username or user.sub
        jobs = []
        if owner_key:
            jobs = self.jobs.list_by_owner(owner_key, limit=job_limit)

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
                "organization": user.dept,
                "locale": user.locale,
                "last_login_at": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
            },
            "jobs": serialized_jobs,
            "jobs_count": len(serialized_jobs),
        }


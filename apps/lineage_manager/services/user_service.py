from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from lineage_manager.core.auth import serialize_user
from lineage_manager.core.uow import UserUnitOfWork
from lineage_manager.models import GraphUserAccount


class UserService:
    def __init__(self, uow: UserUnitOfWork):
        self.uow = uow

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
                "dept": user.dept,
                "last_login_at": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
            },          
        }


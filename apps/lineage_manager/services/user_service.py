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

    def _to_dto(self, user: GraphUserAccount) -> Dict[str, Any]:
        return {
            "id": user.id,
            "sub": user.sub,
            "name": user.name,
            "email": user.email,
            "dept": user.dept,
            "roles": user.roles or [],
            "loginId": user.loginId,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
        }

    def list_users(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        with self.uow:
            users = self.uow.users.get_all(limit, offset)
            return [self._to_dto(u) for u in users]

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.uow:
            user = self.uow.users.get_by_id(user_id)
            return self._to_dto(user) if user else None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        with self.uow:
            user = self.uow.users.create(user_data)
            self.uow.commit() # Explicit commit for command
            return self._to_dto(user)

    def update_user(self, user_id: int, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self.uow:
            user = self.uow.users.update(user_id, user_data)
            self.uow.commit()
            return self._to_dto(user) if user else None

    def delete_user(self, user_id: int) -> bool:
        with self.uow:
            deleted = self.uow.users.delete(user_id)
            if deleted:
                self.uow.commit()
            return deleted

    def add_role(self, user_id: int, role: str) -> Optional[Dict[str, Any]]:
        with self.uow:
            user = self.uow.users.add_role(user_id, role)
            self.uow.commit()
            return self._to_dto(user) if user else None

    def remove_role(self, user_id: int, role: str) -> Optional[Dict[str, Any]]:
        with self.uow:
            user = self.uow.users.remove_role(user_id, role)
            self.uow.commit()
            return self._to_dto(user) if user else None


from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select

from lineage_manager.models import GraphUserAccount
from lineage_manager.models.user_account import UserRole
from lineage_manager.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, "graph_user_account")

    def get_by_sub(self, sub: str) -> Optional[GraphUserAccount]:
        stmt = select(GraphUserAccount).where(GraphUserAccount.sub == sub)
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_from_claims(self, claims: Dict[str, Any]) -> GraphUserAccount:
        sub = claims.get("sub")
        if not sub:
            raise ValueError("Missing 'sub' claim in token")

        user = self.get_by_sub(sub)
  
        payload = {
            "email": claims.get("email"),
            "name": claims.get("name") or claims.get("given_name"),
            "loginId": claims.get("preferred_username") or claims.get("email"),
            "dept": claims.get("dept"),
        }
       
        if user:
            # Update existing user - only update fields that are in payload
            for key, value in payload.items():
                if value is not None and hasattr(user, key):
                    setattr(user, key, value)
        else:            
            user = GraphUserAccount(sub=sub, **payload)
            self.db.add(user)

        user.last_login_at = datetime.utcnow()
        self.db.flush()
        return user

    def get_all(self, limit: int = 100, offset: int = 0) -> list[GraphUserAccount]:
        stmt = select(GraphUserAccount).limit(limit).offset(offset)
        return self.db.execute(stmt).scalars().all()

    def get_by_id(self, user_id: int) -> Optional[GraphUserAccount]:
        stmt = select(GraphUserAccount).where(GraphUserAccount.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, user_data: Dict[str, Any]) -> GraphUserAccount:
        # Check sub uniqueness
        if self.get_by_sub(user_data["sub"]):
             raise ValueError(f"User with sub '{user_data['sub']}' already exists")
        
        user = GraphUserAccount(**user_data)
        self.db.add(user)
        self.db.flush()
        return user

    def update(self, user_id: int, user_data: Dict[str, Any]) -> Optional[GraphUserAccount]:
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        for key, value in user_data.items():
            if value is not None and hasattr(user, key):
                setattr(user, key, value)
        
        self.db.flush()
        return user

    def delete(self, user_id: int) -> bool:
        user = self.get_by_id(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.flush()
        return True

    def add_role(self, user_id: int, role: str) -> Optional[GraphUserAccount]:
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        current_roles = user.roles or []
        if role not in current_roles:
            # Create new list with the new role
            new_roles = current_roles + [role]
            
            # If adding Admin or Operator, remove Viewer (higher roles include viewer permissions)
            if role in [UserRole.ADMIN, UserRole.OPERATOR]:
                new_roles = [r for r in new_roles if r != UserRole.VIEWER]
            
            user.roles = new_roles
            self.db.flush()
            
        return user

    def remove_role(self, user_id: int, role: str) -> Optional[GraphUserAccount]:
        user = self.get_by_id(user_id)
        if not user:
             return None
             
        current_roles = user.roles or []
        if role in current_roles:
            user.roles = [r for r in current_roles if r != role]
            
            # If removing Admin/Operator and no other higher roles remain, add Viewer back
            remaining_roles = user.roles
            has_higher_role = any(r in [UserRole.ADMIN, UserRole.OPERATOR] for r in remaining_roles)
            if not has_higher_role and UserRole.VIEWER not in remaining_roles:
                user.roles = remaining_roles + [UserRole.VIEWER]
            
            self.db.flush()
            
        return user

    def _normalize_roles(self, roles: list[str]) -> list[str]:
        """Remove Viewer role if Admin or Operator exists (higher roles include viewer permissions)."""
        if not roles:
            return [UserRole.VIEWER]
        
        has_higher_role = any(r in [UserRole.ADMIN, UserRole.OPERATOR] for r in roles)
        if has_higher_role:
            return [r for r in roles if r != UserRole.VIEWER]
        
        return roles

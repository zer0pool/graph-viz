from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select

from lineage_manager.models import GraphUserAccount
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
            "roles": claims.get("roles") or claims.get("role"),
            "dept": claims.get("dept"),
        }

        if user:
            for key, value in payload.items():
                if value is not None and hasattr(user, key):
                    setattr(user, key, value)
        else:
            user = GraphUserAccount(sub=sub, **payload)
            self.db.add(user)

        user.last_login_at = datetime.utcnow()
        self.db.flush()
        return user

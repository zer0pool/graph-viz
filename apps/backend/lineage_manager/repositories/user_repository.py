from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from lineage_manager.models import UserAccount, ProjectUser, Project, JobOwner, GraphNode
from lineage_manager.models.user_account import UserRole
from lineage_manager.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db):
        super().__init__(db, UserAccount)

    def count_users(self) -> int:
        """Get total number of users."""
        return self.session.query(UserAccount).count()

    def get_by_sub(self, sub: str) -> Optional[UserAccount]:
        stmt = select(UserAccount).where(UserAccount.sub == sub)
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_from_claims(self, claims: Dict[str, Any]) -> UserAccount:
        sub = claims.get("sub")
        if not sub:
            raise ValueError("Missing 'sub' claim in token")

        # Default to Viewer if no roles provided
        roles = claims.get("roles")
        if not roles:
            roles = [UserRole.VIEWER]

        payload = {
            "email": claims.get("mail"),
            "name": claims.get("username_en"),
            "login_id": claims.get("loginid"),  # Renamed from loginId
            "roles": roles,
            "department": claims.get("deptname_en"),  # Renamed from dept
            "user_id": claims.get("mail"),  # LowerCaseString handles normalization
        }

        # Prioritize lookup by user_id (email) to align with graph owners
        user = self.get_catalog_user(payload["user_id"])
        if not user:
            # Fallback to sub if not found by email
            user = self.get_by_sub(sub)

        if user:
            # Update existing user (updates sub if it changed or was missing)
            user.sub = sub
            for key, value in payload.items():
                if value is not None and hasattr(user, key):
                    setattr(user, key, value)
        else:
            # Create brand new user
            user = UserAccount(sub=sub, **payload)
            self.db.add(user)

        user.last_login_at = datetime.utcnow()
        self.db.flush()
        return user

    # Catalog methods - checking UserAccount directly
    def get_catalog_user(self, user_id: str) -> Optional[UserAccount]:
        """Get user by user_id."""
        if not user_id:
            return None
        return self.session.query(UserAccount).filter_by(user_id=user_id).first()

    def create_or_update_catalog_user(
        self,
        user_id: str,
        email: str = None,
        name: str = None,
        department: str = None,
        status: str = "ACTIVE",
    ) -> UserAccount:
        """Create or update user details."""
        if not user_id:
            raise ValueError("user_id is required")
            
        existing = self.get_catalog_user(user_id)
        if existing:
            if email:
                existing.email = email
            if name:
                existing.name = name
            if department:
                existing.department = department
            existing.status = status
            self.session.flush()
            return existing
        else:
            # We need a 'sub' for new users if they are created via catalog sync,
            # but usually they are created via login.
            # If creating purely from catalog, we might need a dummy sub.
            user = UserAccount(
                sub=f"catalog:{user_id}",
                user_id=user_id,
                email=email,
                name=name,
                department=department,
                status=status,
            )
            self.session.add(user)
            self.session.flush()
            return user

    def find_by_project(self, project_id: str) -> List[UserAccount]:
        """Find all users belonging to a project."""
        return (
            self.session.query(UserAccount)
            .join(ProjectUser, UserAccount.user_id == ProjectUser.user_id)
            .filter(ProjectUser.project_id == project_id)
            .all()
        )

    def list_user_projects(self, user_id: str) -> List[Project]:
        """List all projects a user belongs to."""
        return (
            self.session.query(Project)
            .join(ProjectUser, Project.project_id == ProjectUser.project_id)
            .filter(ProjectUser.user_id == user_id)
            .all()
        )

    def list_owned_jobs(self, user_id: str) -> List[GraphNode]:
        """List all jobs owned by a user."""
        return (
            self.session.query(GraphNode)
            .join(JobOwner, GraphNode.id == JobOwner.job_id)
            .filter(JobOwner.user_id == user_id)
            .all()
        )

    def clear_catalog_users(self):
        """Clear all entries from user table (DANGEROUS)."""
        from sqlalchemy import text

        self.db.execute(text("DELETE FROM user_account"))

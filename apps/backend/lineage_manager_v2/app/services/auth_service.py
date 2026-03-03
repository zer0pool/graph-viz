import logging
from datetime import datetime
from typing import Optional

from app.domain.user.entities import User
from app.infrastructure.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def sso_login_or_register(self, user_info: dict) -> User:
        """
        Handles the SSO login flow.
        If user doesn't exist by 'sub', create them.
        Update last_login_at.
        """
        sub = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
        department = user_info.get("department")

        async with self.uow:
            # 1. Look for existing user
            user = await self.uow.users.get_by_sub(sub)

            if not user:
                logger.info(f"Creating new SSO user: {email} (sub: {sub})")
                # Create a new user entity
                # Extract user_id from email prefix if possible
                user_id = email.split("@")[0] if "@" in email else sub[:10]

                user = User(
                    user_id=user_id,
                    sub=sub,
                    email=email,
                    name=name,
                    department=department,
                    roles=["VIEWER"],  # Default role for new SSO users
                    status="ACTIVE",
                    last_login_at=datetime.utcnow(),
                )
            else:
                logger.debug(f"Existing user logging in: {email}")
                # Update login time and potentially other info
                user.last_login_at = datetime.utcnow()
                if name:
                    user.name = name
                if department:
                    user.department = department

            # 2. Save/Update user
            saved_user = await self.uow.users.save(user)
            await self.uow.commit()

            return saved_user

    def create_access_token(self, user: User) -> str:
        """
        Generate a JWT for the user.
        In a real scenario, this would use a library like python-jose
        and settings.SECRET_KEY.
        """
        # Mocking JWT generation for now
        return f"mock_jwt_for_{user.user_id}"

import logging
import secrets
from datetime import datetime
from typing import Any, Dict, Optional

import redis
from fastapi import Request

from app.core.auth import AuthenticationError, OIDCProviderClient
from app.core.config import settings
from app.domain.user.entities import User
from app.infrastructure.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(
        self,
        uow: UnitOfWork,
        oidc_client: OIDCProviderClient,
        redis_client: redis.Redis,
    ):
        self.uow = uow
        self.oidc_client = oidc_client
        self.redis_client = redis_client

    def get_auth_config(self) -> Dict[str, Any]:
        """Return minimal configuration for OIDC login."""
        try:
            config = self.oidc_client.auth_config()
            config["require_signin"] = settings.feature_flags.require_signin
            return config
        except AuthenticationError as exc:
            logger.error("Failed to load auth config: %s", exc)
            raise

    def get_login_url(self, request: Request) -> str:
        """
        Generate OIDC authorization URL and store state in Redis.
        """
        config = self.oidc_client.auth_config()
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)

        # Store state in Redis (5 min TTL)
        redis_key = f"oidc:state:{state}"
        self.redis_client.setex(redis_key, 300, nonce)
        logger.info("[Auth] OIDC state stored in Redis: %s", state)

        params = {
            "client_id": config["client_id"],
            "response_type": "id_token",
            "response_mode": "form_post",
            "scope": config["scope"],
            "redirect_uri": config["redirect_uri"],
            "state": state,
            "nonce": nonce,
        }

        query = "&".join(f"{k}={v}" for k, v in params.items())
        auth_url = f"{config['authorization_endpoint']}?{query}"

        logger.info("[Auth] Generated login URL for state: %s", state)
        return auth_url

    async def handle_callback(
        self, request: Request, token: str, state: str
    ) -> Dict[str, Any]:
        """
        Handle OIDC callback. Automatically detects whether token is a code or id_token.
        """
        # Verify state from Redis
        redis_key = f"oidc:state:{state}"
        stored_nonce = self.redis_client.get(redis_key)

        if not stored_nonce:
            logger.error("[Auth] OIDC state not found or expired in Redis: %s", state)
            raise ValueError("Invalid OIDC state or session expired")

        # Clean up state
        self.redis_client.delete(redis_key)
        logger.info("[Auth] OIDC state verified from Redis")

        try:
            if "." in token and token.count(".") == 2:
                # This is an id_token (JWT format)
                logger.debug("[Auth] Detected id_token")
                claims = self.oidc_client.verify_id_token(token)
            else:
                # This is an authorization code
                logger.debug("[Auth] Detected authorization code")
                token_response = self.oidc_client.exchange_code(
                    token, code_verifier=None
                )
                id_token = token_response.get("id_token")
                claims = self.oidc_client.verify_id_token(id_token)

            logger.info(
                "[Auth] Token verified. Identity: sub=%s, email=%s",
                claims.get("sub"),
                claims.get("email"),
            )

            # Record login & generate user entity
            user = await self.sso_login_or_register(claims)

            # Convert User entity to payload for session
            user_payload = {
                "user_id": user.user_id,
                "sub": user.sub,
                "email": user.email,
                "name": user.name,
                "roles": user.roles,
                "department": user.department,
            }

            # Save user in session (Starlette SessionMiddleware handles this)
            request.session["user"] = user_payload

            logger.info(
                "[Auth] Session established successfully for sub=%s",
                user.sub,
            )
            return user_payload

        except AuthenticationError as exc:
            logger.error("[Auth] OIDC Authentication failed: %s", exc)
            raise

    async def sso_login_or_register(self, claims: dict) -> User:
        """
        Handles the SSO login flow using OIDC claims.
        """
        sub = claims.get("sub")
        email = claims.get("email") or claims.get("mail")
        name = claims.get("name") or claims.get("username_en")
        department = claims.get("department") or claims.get("deptname_en")

        async with self.uow:
            user = await self.uow.users.get_by_sub(sub)

            if not user:
                logger.info(f"Creating new SSO user: {email} (sub: {sub})")
                user_id = email.split("@")[0] if email and "@" in email else sub[:10]

                user = User(
                    user_id=user_id,
                    sub=sub,
                    email=email,
                    name=name,
                    department=department,
                    roles=["VIEWER"],
                    status="ACTIVE",
                    last_login_at=datetime.utcnow(),
                )
            else:
                logger.debug(f"Existing user logging in: {email}")
                user.last_login_at = datetime.utcnow()
                if name:
                    user.name = name
                if department:
                    user.department = department

            saved_user = await self.uow.users.save(user)
            await self.uow.commit()

            return saved_user

    def get_current_user(self, request: Request) -> Optional[Dict[str, Any]]:
        """Return user from session."""
        return request.session.get("user")

    def logout(self, request: Request):
        """Clear session."""
        request.session.clear()
        logger.info("[Auth] Session cleared")

    def create_access_token(self, user: User) -> str:
        """Legacy JWT generation for Bearer flow."""
        return f"mock_jwt_for_{user.user_id}"

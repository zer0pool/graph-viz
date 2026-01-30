import logging
import secrets
from typing import Any, Dict, Optional
from starlette.requests import Request
from starlette.responses import RedirectResponse
from lineage_manager.core.config import get_settings
from lineage_manager.core.auth import OIDCProviderClient, AuthenticationError
from lineage_manager.services.user_service import UserService

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, user_service: UserService, oidc_client: OIDCProviderClient):
        self.user_service = user_service
        self.oidc_client = oidc_client
        self.settings = get_settings()

    def get_auth_config(self) -> Dict[str, Any]:
        """Return minimal configuration for OIDC login."""
        try:
            config = self.oidc_client.auth_config()
            config["require_signin"] = self.settings.require_signin
            return config
        except AuthenticationError as exc:
            logger.error("Failed to load auth config: %s", exc)
            raise

    def get_login_url(self, request: Request) -> str:
        """
        Generate OIDC authorization URL and store state in session.
        """
        config = self.oidc_client.auth_config()
        state = secrets.token_urlsafe(32)
        request.session["oidc_state"] = state
        
        params = {
            "client_id": config["client_id"],
            "response_type": "code",
            "scope": config["scope"],
            "redirect_uri": config["redirect_uri"],
            "state": state,
        }
        
        query = "&".join(f"{k}={v}" for k, v in params.items())
        auth_url = f"{config['authorization_endpoint']}?{query}"
        
        logger.info("[Auth] Generated login URL for state: %s", state)
        return auth_url

    async def handle_callback(self, request: Request, code: str, state: str) -> Dict[str, Any]:
        """
        Exchange authorization code for tokens and update session.
        """
        stored_state = request.session.pop("oidc_state", None)
        if not stored_state or state != stored_state:
            logger.warning("[Auth] OIDC state mismatch: expected %s, got %s", stored_state, state)
            raise ValueError("Invalid OIDC state")

        try:
            # Exchange code for tokens
            token_response = self.oidc_client.exchange_code(code, code_verifier=None)
            id_token = token_response.get("id_token")
            
            # Verify tokens
            claims = self.oidc_client.verify_id_token(id_token)
            
            # Record login & generate user payload
            user_payload = self.user_service.record_login(claims)
            
            # Save user and access_token in session
            request.session["user"] = user_payload
            request.session["access_token"] = token_response.get("access_token")
            
            logger.info("[Auth] User '%s' authenticated successfully via BFF", user_payload.get("sub"))
            return user_payload
            
        except AuthenticationError as exc:
            logger.error("[Auth] BFF Callback failed: %s", exc)
            raise

    def get_current_user(self, request: Request) -> Dict[str, Any]:
        """
        Retrieve the current user from the session.
        """
        user = request.session.get("user")
        if not user:
            if not self.settings.require_signin:
                 return {
                    "sub": "anonymous-user",
                    "name": "Anonymous User",
                    "is_anonymous": True
                }
            return None
        return user

    def logout(self, request: Request):
        """
        Clear the user session.
        """
        request.session.clear()
        logger.info("[Auth] Session cleared")

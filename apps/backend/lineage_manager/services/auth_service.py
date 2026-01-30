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
    def __init__(self, user_service: UserService, oidc_client: OIDCProviderClient, redis_client: RedisClient):
        self.user_service = user_service
        self.oidc_client = oidc_client
        self.settings = get_settings()
        self.redis_client = redis_client

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
        nonce = secrets.token_urlsafe(32)
        
        # Store state in Redis ( 5 min TTL )
        if self.redis_client:
            redis_key = f"oidc:state:{state}"
            self.redis_client.setex(redis_key, 300, nonce)
            logger.info("[Auth] OIDC state stored in Redis: %s", state)
        else:
            # Fallback to session if Redis is not available
            request.session["oidc_state"] = state
            request.session["oidc_nonce"] = nonce
            logger.warning("[Auth] Redis client is not available.")

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

    async def handle_callback(self, request: Request, token: str, state: str) -> Dict[str, Any]:
        """
        Handle OIDC callback for both Authorization Code FLow and Implicit Flow.
        Automatically detects whether toekn is a code or id_token.
        """

        # Verify state from Redis or session
        store_nonce = None
        if  self.redis_client:
            redis_key = f"oidc:state:{state}"
            store_nonce = self.redis_client.get(redis_key)
            if stored_nonce:
                # Redis already returns string when decode_response=True
                if isinstance(store_nonce, bytes):
                    store_nonce = store_nonce.decode('utf-8')
                self.redis_client.delete(redis_key)
                logger.info("[Auth] Retrieved state freom Redis: %s", state)
            else:
                logger.error("[Auth] OIDC state not found in Redis: %s", state)
                
        if not store_nonce:
            # Fallback to session
            stored_state = request.session.pop("oidc_state", None)
            stored_nonce = request.session.pop("oidc_nonce", None)
            if not stored_state or state != stored_state:
                logger.error("[Auth] OIDC state mismatch! Stored: %s, Received: %s", stored_state, state)
                raise ValueError("Invalid OIDC state")
        else:
            logger.info("[Auth] OIDC state verified from Redis")
            
        logger.info("[Auth] State verified. Processing Token...")        
        try:
            # Detect if token is a code or id_tokne
            # JWT tokens have 3 parts separated by dots, codes are usually shorter
            if "." in token and toekn.count(".") == 2:
                # This is an id_token  (JWT format)
                logger.info("[Auth] Detected id_token")
                claims = self.oidc_client.verify_id_token(token)
            else:
                # This is an authorization code (Implicit Flow)
                logger.info("[Auth] Detected authorization code")
                token_response = self.oidc_client.exchange_code(token, code_verifier=None)
                id_token = token_response.get("id_token")
                claims = self.oidc_client.verify_id_token(id_token)                
                
            logger.info("[Auth] Token verified. Identity: sub=%s, email=%s", claims.get("sub"), claims.get("email"))
            
            # Record login & generate user payload
            user_payload = self.user_service.record_login(claims)
            
            # Save user in session
            request.session["user"] = user_payload            
            
            logger.info("[Auth] Session established successfully in backend for sub=%s", user_payload.get("sub"))
            return user_payload
            
        except AuthenticationError as exc:
            logger.error("[Auth] OIDC Authentication failed: %s", exc)
            raise

    def get_current_user(self, request: Request) -> Dict[str, Any]:
        """
        Get the currently logged-in user from the session.
        Returns None if not logged in (and strict auth is on).
        Returns Anonymous User if not logged in (and strict auth is off).
        """
        # 1. Check Raw Session Data
        session_user = request.session.get("user")
        
        if session_user:
            logger.info(f"[Auth][get_current_user] ✅ Session HIT. Found user: {session_user.get('sub')} (email={session_user.get('email')})")
            return session_user

        # 2. No Session - Check Configuration
        require_signin = self.settings.require_signin
        logger.info(f"[Auth][get_current_user] ⚠️ Session MISS. Checking 'require_signin' config... Value={require_signin}")

        if not require_signin:
            logger.info("[Auth][get_current_user] 🔓 'require_signin' is FALSE. Falling back to ANONYMOUS USER.")
            return {
                "sub": "anonymous-user",
                "name": "Anonymous User",
                "email": "anonymous@lineage.manager",
                "roles": ["admin"],
                "dept": "Engineering",
                "is_anonymous": True
            }
        
        # 3. Strict Auth Endpoint
        logger.info("[Auth][get_current_user] 🔒 'require_signin' is TRUE. Returning None (Client should 401).")
        return None

    def logout(self, request: Request):
        """
        Clear the user session.
        """
        request.session.clear()
        logger.info("[Auth] Session cleared")

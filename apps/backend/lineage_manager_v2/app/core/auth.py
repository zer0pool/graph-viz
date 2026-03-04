import logging
import time
from typing import Any, Dict, Optional

import httpx
import jwt
from jwt import PyJWKClient, PyJWKClientError

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when token validation fails."""


class OIDCProviderClient:
    """
    Minimal OIDC helper capable of fetching metadata, exchanging authorization codes,
    and validating ID tokens using the provider JWKS.
    """

    def __init__(
        self,
        issuer: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        audience: Optional[str] = None,
        scopes: Optional[list[str]] = None,
        cache_seconds: int = 3600,
        http_timeout: float = 5.0,
    ):
        self.issuer = issuer.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.audience = audience or client_id
        self.scopes = scopes or ["openid", "email", "profile"]
        self.cache_seconds = cache_seconds
        self.http_timeout = http_timeout
        self._metadata: Optional[Dict[str, Any]] = None
        self._metadata_expiry: float = 0.0
        self._jwk_client: Optional[PyJWKClient] = None

    def _get_metadata(self) -> Dict[str, Any]:
        if self._metadata and time.time() < self._metadata_expiry:
            return self._metadata
        well_known = f"{self.issuer}/.well-known/openid-configuration"
        logger.debug("Fetching OIDC metadata from %s", well_known)
        try:
            with httpx.Client(timeout=self.http_timeout) as client:
                resp = client.get(well_known)
                resp.raise_for_status()
                try:
                    self._metadata = resp.json()
                except ValueError as exc:
                    logger.error("Failed to decode OIDC metadata JSON: %s", exc)
                    raise AuthenticationError("Invalid OIDC metadata JSON") from exc
                self._metadata_expiry = time.time() + self.cache_seconds
        except httpx.HTTPError as exc:
            logger.error("Failed to load OIDC metadata: %s", exc)
            raise AuthenticationError(f"Failed to load OIDC metadata: {exc}") from exc
        if not self._metadata:
            logger.error("OIDC metadata response was empty")
            raise AuthenticationError("OIDC metadata response was empty")
        return self._metadata

    def _get_jwk_client(self) -> PyJWKClient:
        if self._jwk_client:
            return self._jwk_client
        metadata = self._get_metadata()
        jwks_uri = metadata.get("jwks_uri")
        if not jwks_uri:
            raise AuthenticationError("OIDC metadata missing 'jwks_uri'")
        self._jwk_client = PyJWKClient(jwks_uri)
        return self._jwk_client

    def auth_config(self) -> Dict[str, Any]:
        try:
            metadata = self._get_metadata()
        except AuthenticationError as exc:
            logger.error("Unable to build auth config: %s", exc)
            raise
        config = {
            "issuer": self.issuer,
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "authorization_endpoint": metadata.get("authorization_endpoint"),
            "token_endpoint": metadata.get("token_endpoint"),
            "userinfo_endpoint": metadata.get("userinfo_endpoint"),
        }
        logger.debug(
            "Generated auth config (authorization_endpoint=%s)",
            config.get("authorization_endpoint"),
        )
        return config

    def exchange_code(self, code: str, code_verifier: Optional[str]) -> Dict[str, Any]:
        logger.info("Exchanging authorization code via OIDC provider")
        metadata = self._get_metadata()
        token_endpoint = metadata.get("token_endpoint")
        if not token_endpoint:
            raise AuthenticationError("OIDC metadata missing 'token_endpoint'")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
        }
        if code_verifier:
            data["code_verifier"] = code_verifier
        if self.client_secret:
            data["client_secret"] = self.client_secret

        try:
            with httpx.Client(timeout=self.http_timeout) as client:
                resp = client.post(token_endpoint, data=data)
                resp.raise_for_status()
                try:
                    payload = resp.json()
                except ValueError as exc:
                    logger.error("Token response JSON parse error: %s", exc)
                    raise AuthenticationError("Invalid token response JSON") from exc
                logger.debug(
                    "OIDC token exchange succeeded (keys=%s)", list(payload.keys())
                )
                return payload
        except httpx.HTTPError as exc:
            logger.error("Failed to exchange authorization code: %s", exc)
            raise AuthenticationError(
                f"Failed to exchange authorization code: {exc}"
            ) from exc

    def verify_id_token(self, token: str) -> Dict[str, Any]:
        if not token:
            raise AuthenticationError("Missing token")
        logger.debug("Verifying ID token (length=%d)", len(token))
        jwk_client = self._get_jwk_client()
        try:
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS384", "RS512"],
                audience=self.audience,
                issuer=self.issuer,
            )
        except (PyJWKClientError, jwt.PyJWTError) as exc:
            logger.warning("ID token verification failed: %s", exc)
            raise AuthenticationError(f"Invalid token: {exc}") from exc
        logger.debug(
            "ID token verified for subject '%s' (aud=%s)",
            claims.get("sub"),
            claims.get("aud"),
        )
        return claims

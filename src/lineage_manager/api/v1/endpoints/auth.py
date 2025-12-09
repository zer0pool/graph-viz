import logging
from typing import Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Form, HTTPException
from pydantic import BaseModel

from lineage_manager.core.auth import (
    AuthenticationError,
    OIDCProviderClient,
    serialize_user,
)
from lineage_manager.core.config import get_settings
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class AuthCodePayload(BaseModel):
    code: Optional[str] = None
    id_token: Optional[str] = None
    code_verifier: Optional[str] = None


@router.get("/config")
@inject
def get_auth_config(
    oidc_client: OIDCProviderClient = Depends(Provide[GraphContainer.oidc_provider]),
):
    """
    Return minimal configuration so the frontend knows how to initiate OIDC login.
    """
    try:
        config = oidc_client.auth_config()
    except AuthenticationError as exc:
        logger.error("Failed to load auth config: %s", exc)
        raise HTTPException(
            status_code=503, detail="OIDC metadata unavailable"
        ) from exc

    require_auth = get_settings().require_authentication
    config["require_authentication"] = require_auth
    logger.debug(
        "Auth config requested (issuer=%s, require_auth=%s)",
        config.get("issuer"),
        require_auth,
    )
    return config


@router.post("/exchange")
@inject
def exchange_authorization_code(
    code: Optional[str] = Form(None),
    id_token: Optional[str] = Form(None),
    code_verifier: Optional[str] = Form(None),
    oidc_client: OIDCProviderClient = Depends(Provide[GraphContainer.oidc_provider]),
    user_service: UserService = Depends(Provide[GraphContainer.user_service]),
):
    """
    Exchange an authorization code for tokens via the configured OIDC provider,
    or verify an ID token directly if provided.
    """
    # Create payload from form data
    payload = AuthCodePayload(code=code, id_token=id_token, code_verifier=code_verifier)

    # If ID token is provided directly, verify it without exchanging code
    if payload.id_token:
        try:
            claims = oidc_client.verify_id_token(payload.id_token)
        except AuthenticationError as exc:
            logger.warning("ID token verification failed: %s", exc)
            raise HTTPException(
                status_code=400, detail=f"Failed to verify ID token: {exc}"
            )

        db_user = user_service.record_login(claims)
        user_payload = serialize_user(claims, db_user)

        logger.info(
            "User '%s' authenticated successfully with ID token",
            user_payload.get("sub"),
        )

        return {
            "access_token": None,
            "id_token": payload.id_token,
            "token_type": "Bearer",
            "expires_in": None,
            "refresh_token": None,
            "scope": None,
            "user": user_payload,
        }

    # Otherwise, exchange authorization code for tokens
    try:
        # Clean the code and verifier to remove any potential whitespace issues
        if payload.code:
            payload.code = payload.code.strip()
        if payload.code_verifier:
            payload.code_verifier = payload.code_verifier.strip()

        token_response = oidc_client.exchange_code(payload.code, payload.code_verifier)
    except AuthenticationError as exc:
        logger.warning("Authorization code exchange failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))

    id_token = token_response.get("id_token")

    try:
        claims = oidc_client.verify_id_token(id_token)
    except AuthenticationError as exc:
        logger.warning("ID token verification failed: %s", exc)
        raise HTTPException(status_code=400, detail=f"Failed to verify ID token: {exc}")

    db_user = user_service.record_login(claims)
    user_payload = serialize_user(claims, db_user)

    logger.info(
        "User '%s' exchanged authorization code successfully", user_payload.get("sub")
    )

    return {
        "access_token": token_response.get("access_token"),
        "id_token": id_token,
        "token_type": token_response.get("token_type", "Bearer"),
        "expires_in": token_response.get("expires_in"),
        "refresh_token": token_response.get("refresh_token"),
        "scope": token_response.get("scope"),
        "user": user_payload,
    }

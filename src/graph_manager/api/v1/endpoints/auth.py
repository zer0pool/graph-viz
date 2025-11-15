from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from graph_manager.core.auth import AuthenticationError, OIDCProviderClient, serialize_user
from graph_manager.core.config import get_settings
from graph_manager.core.container import GraphContainer
from graph_manager.services.user_service import UserService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class AuthCodePayload(BaseModel):
    code: str
    code_verifier: str | None = None


@router.get("/config")
@inject
def get_auth_config(
    oidc_client: OIDCProviderClient = Depends(Provide[GraphContainer.oidc_provider]),
):
    """
    Return minimal configuration so the frontend knows how to initiate OIDC login.
    """
    config = oidc_client.auth_config()
    config["require_authentication"] = get_settings().require_authentication
    return config


@router.post("/exchange")
@inject
def exchange_authorization_code(
    payload: AuthCodePayload,
    oidc_client: OIDCProviderClient = Depends(Provide[GraphContainer.oidc_provider]),
    user_service: UserService = Depends(Provide[GraphContainer.user_service]),
):
    """
    Exchange an authorization code for tokens via the configured OIDC provider.
    """
    try:
        token_response = oidc_client.exchange_code(payload.code, payload.code_verifier)
    except AuthenticationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    id_token = token_response.get("id_token")
    try:
        claims = oidc_client.verify_id_token(id_token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=400, detail=f"Failed to verify ID token: {exc}")

    db_user = user_service.record_login(claims)
    user_payload = serialize_user(claims, db_user)

    return {
        "access_token": token_response.get("access_token"),
        "id_token": id_token,
        "token_type": token_response.get("token_type", "Bearer"),
        "expires_in": token_response.get("expires_in"),
        "refresh_token": token_response.get("refresh_token"),
        "scope": token_response.get("scope"),
        "user": user_payload,
    }

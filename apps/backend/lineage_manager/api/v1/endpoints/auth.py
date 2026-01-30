import logging
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from lineage_manager.core.auth import AuthenticationError
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.get("/config")
@inject
def get_auth_config(
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Return minimal configuration for OIDC login."""
    try:
        return auth_service.get_auth_config()
    except AuthenticationError as exc:
        raise HTTPException(status_code=503, detail="OIDC metadata unavailable") from exc

@router.get("/login")
@inject
def login(
    request: Request,
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Start the BFF OIDC login flow by redirecting to the IdP."""
    auth_url = auth_service.get_login_url(request)
    logger.info("Redirecting to OIDC IdP")
    return RedirectResponse(auth_url)

@router.get("/callback")
@inject
async def callback(
    request: Request,
    code: str,
    state: str,
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Handle the OIDC callback, exchange code for tokens, and establish session."""
    try:
        await auth_service.handle_callback(request, code, state)
        # Redirect back to frontend
        return RedirectResponse(url="/admin-console/")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except AuthenticationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/me")
@inject
def get_me(
    request: Request,
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Return the currently authenticated user from session."""
    logger.debug("[Auth] /me endpoint called. Checking session...")
    user = auth_service.get_current_user(request)
    if not user:
        logger.info("[Auth] /me - No user session found. Returning 401.")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logger.info("[Auth] /me - Session found for sub=%s (is_anonymous=%s)", 
                user.get("sub"), user.get("is_anonymous", False))
    return user

@router.post("/logout")
@inject
def logout(
    request: Request,
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Clear the session cookie."""
    auth_service.logout(request)
    return {"status": "ok"}
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

@router.post("/exchange")
@inject
async def exchange(
    request: Request,    
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """Exchange authorization code for tokens, and establish session."""
    try:
        # Get code and state form form date
        form_data = await request.form()
        code = form_data.get("code")
        state = form_data.get("state")

        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing code or state")
        
        await auth_service.handle_callback(request, code, state)
        # Redirect back to frontend
        return RedirectResponse(url="/admin-console/")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except AuthenticationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/authorized")
@inject
async def authorized(
    request: Request,    
    auth_service: AuthService = Depends(Provide[GraphContainer.user.auth_service]),
):
    """handle the OIDC call back for Implicit Flow (id_token received via form_post )"""
    try:
        # Get code and state form form date
        form_data = await request.form()
        id_token = form_data.get("id_token")
        state = form_data.get("state")

        if not id_token or not state:
            raise HTTPException(status_code=400, detail="Missing id_token or state")
        
        await auth_service.handle_callback(request, id_token, state)
        # Redirect back to frontend using 303 See Other to convert POST to GET  
        return RedirectResponse(url="/admin-console/", status_code=303)
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
    logger.info("[Auth] /me endpoint CALLED. Delegating to auth_service...")

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
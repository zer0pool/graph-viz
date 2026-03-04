import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.core.auth import AuthenticationError

from app.api.v1.schemas import auth as auth_schemas
from app.core.container import Container
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/config")
@inject
async def get_auth_config(
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Return minimal configuration for OIDC login."""
    try:
        return auth_service.get_auth_config()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC metadata unavailable",
        ) from exc


@router.get("/login")
@inject
async def login(
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Start the BFF OIDC login flow by redirecting to the IdP."""
    auth_url = auth_service.get_login_url(request)
    logger.info("Redirecting to OIDC IdP")
    return RedirectResponse(auth_url)


@router.post("/authorized")
@inject
async def authorized(
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Handle the OIDC callback for Implicit Flow (id_token received via form_post)."""
    try:
        form_data = await request.form()
        id_token = form_data.get("id_token")
        state = form_data.get("state")

        if not id_token or not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing id_token or state",
            )

        await auth_service.handle_callback(request, id_token, state)
        # Redirect back to frontend using 303 See Other to convert POST to GET
        return RedirectResponse(url="/admin-console/", status_code=status.HTTP_303_SEE_OTHER)
    except (ValueError, AuthenticationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/exchange")
@inject
async def exchange(
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Handle the OIDC callback for Authorization Code Flow."""
    try:
        form_data = await request.form()
        code = form_data.get("code")
        state = form_data.get("state")

        if not code or not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing code or state",
            )

        await auth_service.handle_callback(request, code, state)
        return RedirectResponse(url="/admin-console/", status_code=status.HTTP_303_SEE_OTHER)
    except (ValueError, AuthenticationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login/sso", response_model=auth_schemas.Token)
@inject
async def sso_login(
    request: auth_schemas.SSOLoginRequest,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """
    Authenticate a user via SSO (e.g., Google OAuth2).
    In a real implementation, 'id_token' would be verified using
    google-auth library.
    """
    try:
        # 1. (Mock) Verify ID Token and extract user info
        # Real logic: idinfo = id_token.verify_oauth2_token(request.id_token, requests.Request(), CLIENT_ID)
        mock_user_info = {
            "sub": f"sso_sub_{request.id_token[-10:]}",  # Derived from token for demo
            "email": "sso_user@example.com",
            "name": "SSO Test User",
            "department": "Platform Team",
        }

        # 2. Login or Register user
        user = await auth_service.sso_login_or_register(mock_user_info)

        # 3. Create session token (JWT)
        access_token = auth_service.create_access_token(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600,
        }
    except Exception as e:
        logger.error(f"SSO Login failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO credentials",
        )


@router.get("/me")
@inject
async def get_current_user_info(
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Returns information about the currently authenticated user."""
    user = auth_service.get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return user


@router.post("/logout")
@inject
async def logout(
    request: Request,
    auth_service: AuthService = Depends(Provide[Container.auth_service]),
):
    """Clear the session cookie."""
    auth_service.logout(request)
    return {"status": "ok"}

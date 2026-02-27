import logging
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.schemas import auth as auth_schemas
from app.core.container import Container
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter()


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
            "department": "Platform Team"
        }
        
        # 2. Login or Register user
        user = await auth_service.sso_login_or_register(mock_user_info)
        
        # 3. Create session token (JWT)
        access_token = auth_service.create_access_token(user)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600
        }
    except Exception as e:
        logger.error(f"SSO Login failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO credentials",
        )


@router.get("/me")
@inject
async def get_current_user_info():
    """
    Returns information about the currently authenticated user.
    (Placeholder for auth dependency)
    """
    return {"message": "Authenticated user context here"}

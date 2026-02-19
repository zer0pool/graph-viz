from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    sub: str
    exp: int


class SSOLoginRequest(BaseModel):
    id_token: str  # The JWT from the SSO provider
    provider: str = "google"  # For future multi-provider support


class SSOUserInfo(BaseModel):
    sub: str
    email: EmailStr
    name: str
    department: Optional[str] = None
    picture: Optional[str] = None

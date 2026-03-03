from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


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

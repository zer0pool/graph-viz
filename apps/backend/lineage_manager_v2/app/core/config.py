from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Lineage Manager V2"
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Database (MySQL Async)
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root123"
    DB_NAME: str = "lineage_manager_v2"

    # Computed Database URL
    @property
    def DATABASE_URL(self) -> str:
        # Fallback for environments without aiomysql (e.g. local test runner)
        import importlib.util

        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./lineage_v2.db"

        # Use aiomysql for production
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    # Redis (Async)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # OIDC Authentication
    OIDC_ISSUER_URL: str = "https://accounts.google.com"
    OIDC_CLIENT_ID: str = ""
    OIDC_CLIENT_SECRET: str = ""
    OIDC_REDIRECT_URI: str = "http://localhost:5003/api/v1/auth/authorized"
    OIDC_AUDIENCE: Optional[str] = None
    OIDC_JWKS_CACHE_SECONDS: int = 3600
    OIDC_SCOPES: List[str] = ["openid", "email", "profile"]

    # Application Settings
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "changethis"

    # External APIs
    JOB_MANAGER_URL: str = "http://localhost:9000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra env vars from V1
    )


settings = Settings()

# Verification Log: Print effective config
print("=" * 50)
print(f"[CONFIG] Effective Settings:")
print(f"  - PROJECT_NAME: {settings.PROJECT_NAME}")
print(f"  - DATABASE_URL: {settings.DATABASE_URL}")
print(f"  - REDIS_URL:    {settings.REDIS_URL}")
print("=" * 50)

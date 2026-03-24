import importlib.util
from typing import List, Optional

from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseModel):
    host: str
    port: int
    db: int

    @property
    def url(self) -> str:
        return f"redis://{self.host}:{self.port}/{self.db}"


class MySQLSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    name: str

    @property
    def database_url(self) -> str:
        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./lineage_v2.db"
        return f"mysql+aiomysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}?charset=utf8mb4"


class OIDCSettings(BaseModel):
    issuer_url: str
    client_id: str
    client_secret: str
    redirect_uri: str
    audience: Optional[str]
    jwks_cache_seconds: int
    scopes: List[str]


class FeatureFlags(BaseModel):
    require_signin: bool


class Settings(BaseSettings):
    PROJECT_NAME: str = "Lineage Manager V2"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "changethis"
    LOG_LEVEL: str = "INFO"

    # External APIs
    JOB_MANAGER_URL: str = "http://self-scheduling-backend:5001"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Flat fields for environment variable loading
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root123"
    DB_NAME: str = "lineage_manager_v2"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    OIDC_ISSUER_URL: str = "https://accounts.google.com"
    OIDC_CLIENT_ID: str = ""
    OIDC_CLIENT_SECRET: str = ""
    OIDC_REDIRECT_URI: str = "http://localhost:5003/api/v1/auth/authorized"
    OIDC_AUDIENCE: Optional[str] = None
    OIDC_JWKS_CACHE_SECONDS: int = 3600
    OIDC_SCOPES: List[str] = ["openid", "email", "profile"]

    FRONTEND_URL: str = "http://localhost:5100"

    FEATURE_REQUIRE_SIGNIN: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Property-based nested structure for the requested usage
    @property
    def db(self) -> MySQLSettings:
        return MySQLSettings(
            host=self.DB_HOST,
            port=self.DB_PORT,
            user=self.DB_USER,
            password=self.DB_PASSWORD,
            name=self.DB_NAME,
        )

    @property
    def redis(self) -> RedisSettings:
        return RedisSettings(
            host=self.REDIS_HOST, port=self.REDIS_PORT, db=self.REDIS_DB
        )

    @property
    def oidc(self) -> OIDCSettings:
        return OIDCSettings(
            issuer_url=self.OIDC_ISSUER_URL,
            client_id=self.OIDC_CLIENT_ID,
            client_secret=self.OIDC_CLIENT_SECRET,
            redirect_uri=self.OIDC_REDIRECT_URI,
            audience=self.OIDC_AUDIENCE,
            jwks_cache_seconds=self.OIDC_JWKS_CACHE_SECONDS,
            scopes=self.OIDC_SCOPES,
        )

    @property
    def feature_flags(self) -> FeatureFlags:
        return FeatureFlags(require_signin=self.FEATURE_REQUIRE_SIGNIN)

    @property
    def DATABASE_URL(self) -> str:
        return self.db.database_url

    @property
    def REDIS_URL(self) -> str:
        return self.redis.url


settings = Settings()

# Verification Log: Print effective config
print("=" * 50)
print(f"[CONFIG] Effective Settings:")
print(f"  - PROJECT_NAME: {settings.PROJECT_NAME}")
print(f"  - DATABASE_URL: {settings.DATABASE_URL}")
print(f"  - REDIS_URL:    {settings.REDIS_URL}")
print(f"  - REQUIRE_SIGNIN: {settings.FEATURE_REQUIRE_SIGNIN}")
print("=" * 50)

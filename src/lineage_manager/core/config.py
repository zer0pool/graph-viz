from functools import lru_cache
from typing import List, Optional

from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseSettings):
    """Redis configuration settings with priority: .env > OS environment"""

    host: str = "localhost"
    port: int = 6379
    db: int = 0
    default_ttl: int = 60
    enabled: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="REDIS_",
        case_sensitive=False,
    )


class MySQLSettings(BaseSettings):
    """MySQL configuration settings with priority: .env > OS environment"""

    driver: str = "mysql+pymysql"
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = "root123"
    name: str = "lineage_manager"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="DB_",
        case_sensitive=False,
    )

    @property
    def database_url(self) -> str:
        """Build the database URL from MySQL settings."""
        url = (
            f"{self.driver}://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )
        # Add charset for MySQL drivers
        if self.driver.startswith("mysql") and "charset=" not in url:
            url = f"{url}?charset=utf8mb4"
        return url


class Settings(BaseSettings):
    # Application Settings
    app_name: str = "lineage-manager"
    environment: str = "development"
    debug: bool = True
    secret_key: str = "your-secret-key-here"

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 5003
    workers: int = 4

    # CORS Settings
    allowed_origins: list[str] = ["http://localhost:5003", "http://localhost:3000"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    cors_allow_headers: list[str] = ["*"]

    # Logging
    log_level: str = "INFO"

    # Rate Limiting
    rate_limit_per_second: int = 10
    rate_limit_burst: int = 20

    # Static Files
    static_url: str = "/static/"
    static_root: str = "/app/static/"

    # Database Settings
    database_echo: bool = False
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Job Manager API
    job_manager_url: str = (
        # "https://dev1-self-scheduling.di.atlas.samsung.com/job-manager"
        "http://0.0.0.0:9000"
    )

    # Feature Flags
    enable_swagger: bool = True
    enable_metrics: bool = False
    require_authentication: bool = False
    enable_bigquery: bool = False

    # Redis settings using RedisSettings model
    redis: RedisSettings | None = None

    # MySQL settings using MySQLSettings model
    mysql: MySQLSettings | None = None

    # OIDC / Authentication
    oidc_issuer_url: str = "https://accounts.google.com"
    oidc_client_id: str = ""
    oidc_client_secret: str = ""
    oidc_redirect_uri: str = "http://localhost:5003"
    oidc_audience: str | None = None
    oidc_jwks_cache_seconds: int = 3600
    oidc_scopes: List[str] = ["openid", "email", "profile"]

    def __init__(self, **data):
        # Initialize nested models
        if "redis" not in data:
            data["redis"] = RedisSettings()
        if "mysql" not in data:
            data["mysql"] = MySQLSettings()
        super().__init__(**data)

    # Configuration with priority: .env > OS environment
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="APP_",
        case_sensitive=False,
    )

    @property
    def database_url(self) -> str:
        """Get the database URL from MySQL settings."""
        return self.mysql.database_url

    @field_validator("require_authentication", mode="before")
    @classmethod
    def _normalize_require_auth(cls, value):
        if isinstance(value, str):
            cleaned = value.split("#", 1)[0].strip()
            if cleaned == "":
                return cls.require_authentication
            lowered = cleaned.lower()
            if lowered in {"true", "1", "yes", "on"}:
                return True
            if lowered in {"false", "0", "no", "off"}:
                return False
        return value

    def __repr__(self) -> str:
        """Return a structured representation of the settings."""
        return (
            f"Settings(\n"
            f"  # Application Settings\n"
            f"    app_name={self.app_name!r},\n"
            f"    environment={self.environment!r},\n"
            f"    debug={self.debug},\n"
            f"    secret_key={self.secret_key!r},\n"
            f"  # Server Settings\n"
            f"    host={self.host!r},\n"
            f"    port={self.port},\n"
            f"    workers={self.workers},\n"
            f"  # CORS Settings\n"
            f"    allowed_origins={self.allowed_origins},\n"
            f"    cors_allow_credentials={self.cors_allow_credentials},\n"
            f"    cors_allow_methods={self.cors_allow_methods},\n"
            f"    cors_allow_headers={self.cors_allow_headers},\n"
            f"  # Logging\n"
            f"    log_level={self.log_level!r},\n"
            f"  # Rate Limiting\n"
            f"    rate_limit_per_second={self.rate_limit_per_second},\n"
            f"    rate_limit_burst={self.rate_limit_burst},\n"
            f"  # Static Files\n"
            f"    static_url={self.static_url!r},\n"
            f"    static_root={self.static_root!r},\n"
            f"  # Database Settings\n"
            f"    database_url={self.database_url!r},\n"
            f"    database_echo={self.database_echo},\n"
            f"    database_pool_size={self.database_pool_size},\n"
            f"    database_max_overflow={self.database_max_overflow},\n"
            f"  # Job Manager API\n"
            f"    job_manager_url={self.job_manager_url!r},\n"
            f"  # Feature Flags\n"
            f"    enable_swagger={self.enable_swagger},\n"
            f"    enable_metrics={self.enable_metrics},\n"
            f"    require_authentication={self.require_authentication},\n"
            f"  # Redis Settings\n"
            f"    redis={self.redis!r},\n"
            f"  # MySQL Settings\n"
            f"    mysql={self.mysql!r},\n"
            f"  # OIDC / Authentication\n"
            f"    oidc_issuer_url={self.oidc_issuer_url!r},\n"
            f"    oidc_client_id={self.oidc_client_id!r},\n"
            f"    oidc_client_secret={self.oidc_client_secret!r},\n"
            f"    oidc_redirect_uri={self.oidc_redirect_uri!r},\n"
            f"    oidc_audience={self.oidc_audience!r},\n"
            f"    oidc_jwks_cache_seconds={self.oidc_jwks_cache_seconds},\n"
            f"    oidc_scopes={self.oidc_scopes},\n"
            f")"
        )

    def __str__(self) -> str:
        """Return a JSON-formatted representation of the settings."""
        import json

        return json.dumps(self.model_dump(), indent=2)


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    print(f"Database URL built from DB_* settings: {settings.database_url}")
    print(f"Loaded settings: {repr(settings)}")
    print(settings)
    return settings


if __name__ == "__main__":
    # Print configuration when run directly
    print("=== Lineage Manager Configuration ===")
    settings = get_settings()
    print("=== Configuration Details ===")
    print(f"Application Name: {settings.app_name}")
    print(f"Environment: {settings.environment}")
    print(f"Debug Mode: {settings.debug}")
    print(f"Host: {settings.host}")
    print(f"Port: {settings.port}")
    print(f"Database URL: {settings.database_url}")
    print(f"Job Manager URL: {settings.job_manager_url}")
    print("=====================================")

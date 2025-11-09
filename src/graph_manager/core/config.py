from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application Settings
    app_name: str = "graph-viz"
    environment: str = "development"
    debug: bool = True
    secret_key: str = "your-secret-key-here"

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # CORS Settings
    allowed_origins: List[str] = ["http://localhost:8000", "http://localhost:3000"]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    cors_allow_headers: List[str] = ["*"]

    # Logging
    log_level: str = "INFO"

    # Rate Limiting
    rate_limit_per_second: int = 10
    rate_limit_burst: int = 20

    # Static Files
    static_url: str = "/static/"
    static_root: str = "/app/static/"

    # Database Settings (either provide DATABASE_URL or DB_* to construct it)
    # Individual DB settings
    db_driver: str = "mysql+pymysql"  # e.g., mysql+pymysql, postgresql+psycopg2, sqlite
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "root123"
    db_name: str = "graph_service"

    # Direct URL (takes precedence if provided)
    database_url: str | None = None
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Job Manager API
    job_manager_url: str = (
        "https://dev1-self-scheduling.di.atlas.samsung.com/job-manager"
    )

    # Feature Flags
    enable_swagger: bool = True
    enable_metrics: bool = False

    # Redis cache settings (for query service)
    redis_enabled: bool = False
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_default_ttl: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    # If DATABASE_URL is not provided, build it from DB_* fields
    if not settings.database_url:
        if settings.db_driver.startswith("sqlite"):
            # For sqlite, db_name is the file path or :memory:
            db_path = settings.db_name
            settings.database_url = f"{settings.db_driver}:///{db_path}"
        else:
            # Build URL for server-based databases
            url = (
                f"{settings.db_driver}://{settings.db_user}:{settings.db_password}"
                f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
            )
            # Add charset for MySQL drivers
            if settings.db_driver.startswith("mysql") and "charset=" not in url:
                url = f"{url}?charset=utf8mb4"
            settings.database_url = url

    return settings

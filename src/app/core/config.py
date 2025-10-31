from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

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

    # Feature Flags
    enable_swagger: bool = True
    enable_metrics: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
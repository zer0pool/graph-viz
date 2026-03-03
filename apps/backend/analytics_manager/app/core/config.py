from typing import List, Optional
from functools import cached_property
import importlib.util

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Analytics Manager"
    API_V1_STR: str = "/analytics-manager/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Database
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root123"
    DB_NAME: str = "analytics_manager_v1"
    LINEAGE_DB_NAME: str = "lineage_manager"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 2

    # Google Cloud
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_PROJECT_ID: Optional[str] = None

    # Internal Services
    LINEAGE_MANAGER_V2_URL: str = "http://localhost:8001"

    # BigQuery
    FEATURE_HISTORY_TABLE: str = "test_data.admin_job_run_history"
    BIGQUERY_VISIT_LOG_TABLE: str = "test_data.visit_logs"

    # Cache
    ANALYTICS_CACHE_TTL_SEC: int = 3600

    @cached_property
    def DATABASE_URL(self) -> str:
        """Async MySQL URL with SQLite fallback for local testing"""
        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./analytics_manager.db"

        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    @cached_property
    def LINEAGE_DATABASE_URL(self) -> str:
        """Lineage DB connection URL"""
        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./lineage_manager.db"

        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.LINEAGE_DB_NAME}?charset=utf8mb4"

    @property
    def REDIS_URL(self) -> str:
        """Application Cache (DB 2)"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def CELERY_BROKER_URL(self) -> str:
        """Shared Message Queue (Event Bus) - DB 0"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )


settings = Settings()

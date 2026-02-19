from typing import List, Optional
from functools import cached_property
import importlib.util

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Metrics Manager"
    API_V1_STR: str = "/metrics-manager/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Database
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root123"
    DB_NAME: str = "metrics_manager_v1"
    LINEAGE_DB_NAME: str = "lineage_manager"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 2

    # Google Cloud
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_PROJECT_ID: Optional[str] = "your-gcp-project-id"

    # BigQuery
    FEATURE_BIGQUERY_HISTORY_TABLE: str = "gizmopool.test_data.table_load_history"
    BIGQUERY_VISIT_LOG_TABLE: str = "gizmopool.test_data.visit_logs"

    @cached_property
    def DATABASE_URL(self) -> str:
        """Async MySQL URL with SQLite fallback for local testing"""
        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./metrics_manager.db"

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

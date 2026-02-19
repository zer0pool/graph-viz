from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Metrics Manager"
    API_V1_STR: str = "/metrics-manager/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Database (MySQL Async)
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 33306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root123"
    DB_NAME: str = "metrics_manager_v1"

    # Redis (Async)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 2

    # Google Cloud
    # Can be a file path OR raw JSON content.
    # Usually, google-auth lib automatically checks GOOGLE_APPLICATION_CREDENTIALS env.
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Just in case we need project ID explicitly
    GOOGLE_PROJECT_ID: Optional[str] = "your-gcp-project-id"

    # BigQuery
    FEATURE_BIGQUERY_HISTORY_TABLE: str = "gizmopool.test_data.table_load_history"

    @property
    def DATABASE_URL(self) -> str:
        # Fallback for sqlite test
        import importlib.util

        if not importlib.util.find_spec("aiomysql"):
            return "sqlite+aiosqlite:///./metrics_manager.db"

        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    @property
    def REDIS_URL(self) -> str:
        """Application Cache (DB 2)"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def CELERY_BROKER_URL(self) -> str:
        """Shared Message Queue (Event Bus) - DB 0"""
        # All services must use the SAME DB for Celery/PubSub to exchange messages
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )


settings = Settings()

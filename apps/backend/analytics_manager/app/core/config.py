from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Analytics Manager"
    API_V1_STR: str = "/analytics-manager/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

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

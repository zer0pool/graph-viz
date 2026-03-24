from typing import List, Optional

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseModel):
    host: str
    port: int
    db: int

    @property
    def url(self) -> str:
        """Application Cache (DB 2)"""
        return f"redis://{self.host}:{self.port}/{self.db}"

    @property
    def celery_broker_url(self) -> str:
        """Shared Message Queue (Event Bus) - DB 0"""
        return f"redis://{self.host}:{self.port}/0"


class GoogleSettings(BaseModel):
    application_credentials: Optional[str]
    project_id: Optional[str]


class BigQuerySettings(BaseModel):
    history_table: str
    visit_log_table: str
    job_run_history_table: str


class ExternalServices(BaseModel):
    lineage_manager_url: str


class FeatureFlags(BaseModel):
    history_table: str


class Settings(BaseSettings):
    PROJECT_NAME: str = "Analytics Manager"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    ANALYTICS_CACHE_TTL_SEC: int = 3600
    ANALYTICS_CACHE_TTL_EMPTY_SEC: int = 60  # Short TTL when BQ returns empty

    # Flat fields for environment variable loading
    # We name them exactly as the env vars to avoid collision with nested properties
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 2

    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_PROJECT_ID_RAW: Optional[str] = None  # Renamed to avoid property collision

    BIGQUERY_HISTORY_TABLE: str = "test_data.admin_job_run_history"
    BIGQUERY_VISIT_LOG_TABLE_RAW: str = "test_data.visit_logs"
    BIGQUERY_JOB_RUN_HISTORY_TABLE: str = (
        "test_project_name.tmp_sss_993.admin_finish_history"
    )

    LINEAGE_MANAGER_URL_RAW: str = (
        "http://localhost:8001"  # Renamed to avoid property collision
    )

    FEATURE_HISTORY_TABLE: str = "test_data.admin_job_run_history"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Custom environment mapping for renamed fields
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (init_settings, env_settings, dotenv_settings, file_secret_settings)

    # Property-based nested structure
    @property
    def redis(self) -> RedisSettings:
        return RedisSettings(
            host=self.REDIS_HOST, port=self.REDIS_PORT, db=self.REDIS_DB
        )

    @property
    def google(self) -> GoogleSettings:
        return GoogleSettings(
            application_credentials=self.GOOGLE_APPLICATION_CREDENTIALS,
            project_id=self.GOOGLE_PROJECT_ID_RAW,
        )

    @property
    def bigquery(self) -> BigQuerySettings:
        return BigQuerySettings(
            history_table=self.BIGQUERY_HISTORY_TABLE,
            visit_log_table=self.BIGQUERY_VISIT_LOG_TABLE_RAW,
            job_run_history_table=self.BIGQUERY_JOB_RUN_HISTORY_TABLE,
        )

    @property
    def external(self) -> ExternalServices:
        return ExternalServices(lineage_manager_url=self.LINEAGE_MANAGER_URL_RAW)

    @property
    def features(self) -> FeatureFlags:
        return FeatureFlags(history_table=self.FEATURE_HISTORY_TABLE)

    # Compatibility Properties (Legacy accessors)
    @property
    def REDIS_URL(self) -> str:
        return self.redis.url

    @property
    def CELERY_BROKER_URL(self) -> str:
        return self.redis.celery_broker_url

    @property
    def GOOGLE_PROJECT_ID(self) -> Optional[str]:
        return self.google.project_id

    @property
    def JOB_RUN_HISTORY_TABLE(self) -> str:
        return self.bigquery.job_run_history_table

    @property
    def BIGQUERY_VISIT_LOG_TABLE(self) -> str:
        return self.bigquery.visit_log_table

    @property
    def LINEAGE_MANAGER_URL(self) -> str:
        return self.external.lineage_manager_url


settings = Settings()

# lineage_manager/core/config.py
"""
Configuration module - Manages all settings in a single file
Priority: .env > OS environment > default values
"""

from functools import lru_cache
from typing import List, Optional
import json
import os
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env file explicitly from project root
from dotenv import load_dotenv

# Find .env file in the lineage_manager directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=False)


# ============================================================================
# Nested Settings Models
# ============================================================================

class RedisSettings(BaseSettings):
    """Redis configuration"""
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    default_ttl: int = 60
    enabled: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="REDIS_",   
    )

class MySQLSettings(BaseSettings):
    """MySQL database configuration"""
    driver: str = "mysql+pymysql"
    host: str = "172.17.0.1"
    port: int = 33306
    user: str = "root"
    password: str = "root123"
    name: str = "lineage_manager"
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="DB_",   
    )
    
    @property
    def database_url(self) -> str:
        """Build database URL from MySQL settings"""
        url = (
            f"{self.driver}://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )
        if self.driver.startswith("mysql") and "charset=" not in url:
            url = f"{url}?charset=utf8mb4"
        return url


class OIDCSettings(BaseSettings):
    """OpenID Connect (OIDC) / Authentication settings"""
    issuer_url: str = "https://accounts.google.com"
    client_id: str = ""
    client_secret: str = ""
    redirect_uri: str = "http://localhost:5003"
    audience: Optional[str] = None
    jwks_cache_seconds: int = 3600
    scopes: List[str] = ["openid", "email", "profile"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="OIDC_",  
    )

class FeatureFlags(BaseSettings):
    """Feature flags for enabling/disabling functionality"""
    enable_swagger: bool = True
    enable_metrics: bool = False
    require_signin: bool = False
    enable_bigquery: bool = False
    enable_audit_logging: bool = True
    enable_rate_limiting: bool = True
    history_table: str = "history"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="FEATURE_",  
    )

class CORSSettings(BaseSettings):
    """Cross-Origin Resource Sharing (CORS) configuration"""
    allowed_origins: list[str] = ["http://localhost:5003", "http://localhost:3000"]
    allow_credentials: bool = True
    allow_methods: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers: list[str] = ["*"]
    expose_headers: list[str] = ["Content-Length", "Content-Range"]
    max_age: int = 600
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="CORS_",  
    )
    
    def to_dict(self) -> dict:
        """Convert to dict format for FastAPI CORSMiddleware"""
        return {
            "allow_origins": self.allowed_origins,
            "allow_credentials": self.allow_credentials,
            "allow_methods": self.allow_methods,
            "allow_headers": self.allow_headers,
            "expose_headers": self.expose_headers,
            "max_age": self.max_age,
        }


class RateLimitingSettings(BaseSettings):
    """Rate limiting configuration"""
    per_second: int = 10
    burst: int = 20
    enabled: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="RATE_LIMIT_",  
    )


class SSESettings(BaseSettings):
    """Server-Sent Events (SSE) configuration"""
    buffer_size: int = 256
    event_poll_interval_ms: int = 15_000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="SSE_",  
    )


# ============================================================================
# Main Settings
# ============================================================================

class Settings(BaseSettings):
    """Main settings class - Combines all configuration sections"""
    
    # ─────────────────────────────────────────────────────────────────────
    # Server & Application Settings
    # ─────────────────────────────────────────────────────────────────────
    app_name: str = "lineage-manager"
    environment: str = "development"
    debug: bool = True
    secret_key: str = "your-secret-key-here"
    host: str = "0.0.0.0"
    port: int = 5003
    workers: int = 4
    
    # ─────────────────────────────────────────────────────────────────────
    # External Services
    # ─────────────────────────────────────────────────────────────────────
    job_manager_url: str = "http://0.0.0.0:9000"
    
    # ─────────────────────────────────────────────────────────────────────
    # Static Files
    # ─────────────────────────────────────────────────────────────────────
    static_url: str = "/static/"
    static_root: str = "/app/static/"
    
    # ─────────────────────────────────────────────────────────────────────
    # Logging
    # ─────────────────────────────────────────────────────────────────────
    log_level: str = "INFO"
    
    # ─────────────────────────────────────────────────────────────────────
    # Nested Configuration Models
    # ─────────────────────────────────────────────────────────────────────
    redis: RedisSettings = RedisSettings()
    mysql: MySQLSettings = MySQLSettings()
    oidc: OIDCSettings = OIDCSettings()
    feature_flags: FeatureFlags = FeatureFlags()
    cors: CORSSettings = CORSSettings()
    rate_limiting: RateLimitingSettings = RateLimitingSettings()
    sse: SSESettings = SSESettings()
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="APP_",
        case_sensitive=False,
    )
    
    # ─────────────────────────────────────────────────────────────────────
    # Convenience Properties
    # ─────────────────────────────────────────────────────────────────────
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return self.mysql.database_url
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == "production"
    
    @property
    def require_authentication(self) -> bool:
        """Check if authentication is required (legacy name, maps to require_signin)"""
        return self.feature_flags.require_signin
    
    @property
    def require_signin(self) -> bool:
        """Check if sign-in is required"""
        return self.feature_flags.require_signin
    
    # ─────────────────────────────────────────────────────────────────────
    # String Representations
    # ─────────────────────────────────────────────────────────────────────
    
    def __repr__(self) -> str:
        """Return structured string representation"""
        return (
            f"Settings(\n"
            f"  # Server\n"
            f"    app_name={self.app_name!r}, environment={self.environment!r},\n"
            f"    debug={self.debug}, host={self.host!r}:{self.port},\n"
            f"  # Database\n"
            f"    database_url={self.database_url!r},\n"
            f"  # Redis\n"
            f"    redis_enabled={self.redis.enabled}, host={self.redis.host}:{self.redis.port},\n"
            f"  # OIDC\n"
            f"    require_signin={self.feature_flags.require_signin},\n"
            f"    oidc_issuer={self.oidc.issuer_url!r},\n"
            f"  # Features\n"
            f"    swagger={self.feature_flags.enable_swagger},\n"
            f"    audit_logging={self.feature_flags.enable_audit_logging},\n"
            f"  # SSE\n"
            f"    sse_buffer_size={self.sse.buffer_size},\n"
            f"    event_poll_interval_ms={self.sse.event_poll_interval_ms},\n"            
            f")"

        )
    
    def __str__(self) -> str:
        """Return JSON formatted representation"""
        return json.dumps(self.model_dump(), indent=2, default=str)


# ============================================================================
# Singleton Settings Loader
# ============================================================================

@lru_cache()
def get_settings() -> Settings:
    """Return singleton instance of Settings"""
    return Settings()


# ============================================================================
# CLI Usage
# ============================================================================

if __name__ == "__main__":
    settings = get_settings()
    print("=" * 50)
    print("Lineage Manager Configuration")
    print("=" * 50)
    print(repr(settings))
    print("\n" + "=" * 50)
    print("Full Configuration (JSON)")
    print("=" * 50)
    print(settings)


from app.core.config import Settings
import os

def test_config_nested_loading_analytics():
    # Set environment variables to test nested loading
    os.environ["REDIS_DB"] = "5"
    os.environ["GOOGLE_PROJECT_ID_RAW"] = "test-project"
    os.environ["BIGQUERY_VISIT_LOG_TABLE_RAW"] = "custom.table"
    
    # Reload settings
    from app.core import config
    import importlib
    importlib.reload(config)
    settings = config.Settings()
    
    assert settings.redis.db == 5
    assert settings.google.project_id == "test-project"
    assert settings.bigquery.visit_log_table == "custom.table"

def test_config_compatibility_properties_analytics():
    settings = Settings()
    
    # Check if compatibility properties still work
    assert settings.REDIS_URL == settings.redis.url
    assert settings.GOOGLE_PROJECT_ID == settings.google.project_id
    assert settings.BIGQUERY_VISIT_LOG_TABLE == settings.bigquery.visit_log_table

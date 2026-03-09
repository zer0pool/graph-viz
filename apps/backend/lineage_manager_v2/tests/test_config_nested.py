import os

from app.core.config import Settings


def test_config_nested_loading():
    # Set environment variables to test nested loading
    os.environ["DB_HOST"] = "test-db-host"
    os.environ["REDIS_PORT"] = "9999"
    os.environ["FEATURE_REQUIRE_SIGNIN"] = "True"

    # Reload settings or just instantiate anew
    import importlib

    from app.core import config

    importlib.reload(config)
    settings = config.Settings()

    print(f"DEBUG: db.host={settings.db.host}")
    print(f"DEBUG: redis.port={settings.redis.port}")
    print(
        f"DEBUG: feature_flags.require_signin={settings.feature_flags.require_signin}"
    )

    assert settings.db.host == "test-db-host"
    assert settings.redis.port == 9999
    assert settings.feature_flags.require_signin is True


def test_config_compatibility_properties():
    settings = Settings()

    # Check if compatibility properties still work
    assert settings.DATABASE_URL == settings.db.database_url
    assert settings.REDIS_URL == settings.redis.url
    assert settings.FEATURE_REQUIRE_SIGNIN == settings.feature_flags.require_signin

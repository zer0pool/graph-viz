"""
Core Infrastructure Container.

Provides database connections and authentication services.
Uses get_settings() directly for configuration.
"""

import redis
from dependency_injector import containers, providers

from lineage_manager.core.config import get_settings
from lineage_manager.core.database import Database
from lineage_manager.core.auth import OIDCProviderClient

# Get settings at import time (cached singleton)
_settings = get_settings()


class CoreContainer(containers.DeclarativeContainer):
    """Core infrastructure container for database and auth."""

    # Database
    database = providers.Singleton(Database)

    # Session factories
    session_factory = providers.Singleton(
        lambda db_inst: db_inst.session_factory, database
    )
    write_session_factory = providers.Singleton(
        lambda db_inst: db_inst.write_session_factory, database
    )
    read_session_factory = providers.Singleton(
        lambda db_inst: db_inst.read_session_factory, database
    )

    # Authentication - uses settings directly
    oidc_provider = providers.Singleton(
        OIDCProviderClient,
        issuer=_settings.oidc.issuer_url,
        client_id=_settings.oidc.client_id,
        client_secret=_settings.oidc.client_secret,
        redirect_uri=_settings.oidc.redirect_uri,
        audience=_settings.oidc.audience,
        scopes=_settings.oidc.scopes,
        cache_seconds=_settings.oidc.jwks_cache_seconds,
    )
    # Redis
    redis_client = providers.Singleton(
        redis.Redis,
        host=_settings.redis.host,
        port=_settings.redis.port,
        db=_settings.redis.db,
        decode_responses=True,
    )

"""
Core Infrastructure Container.

Provides database connections and authentication services.
Uses get_settings() directly for configuration.
"""

from dependency_injector import containers, providers

from lineage_manager.core.config import get_settings
from lineage_manager.core.database import Database, db
from lineage_manager.core.auth import OIDCProviderClient


# Get settings at import time (cached singleton)
_settings = get_settings()


class CoreContainer(containers.DeclarativeContainer):
    """Core infrastructure container for database and auth."""
    
    # Database
    database = providers.Singleton(Database)
    
    # Session factories
    session_factory = providers.Singleton(lambda: db.session_factory)
    write_session_factory = providers.Singleton(lambda: db.write_session_factory)
    read_session_factory = providers.Singleton(lambda: db.read_session_factory)
    
    # Authentication - uses settings directly
    oidc_provider = providers.Singleton(
        OIDCProviderClient,
        issuer=_settings.oidc_issuer_url,
        client_id=_settings.oidc_client_id,
        client_secret=_settings.oidc_client_secret,
        redirect_uri=_settings.oidc_redirect_uri,
        audience=_settings.oidc_audience,
        scopes=_settings.oidc_scopes,
        cache_seconds=_settings.oidc_jwks_cache_seconds,
    )

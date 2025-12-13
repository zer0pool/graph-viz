"""
Core Infrastructure Container.

Provides database connections, configuration, and authentication services.
"""

from dependency_injector import containers, providers

from lineage_manager.core.database import Database, db
from lineage_manager.core.auth import OIDCProviderClient


class CoreContainer(containers.DeclarativeContainer):
    """Core infrastructure container for database, config, and auth."""
    
    # Configuration
    config = providers.Configuration()
    
    # Database
    database = providers.Singleton(Database)
    
    # Write Sessions (for mutations)
    write_session_factory = providers.Singleton(lambda: db.write_session_factory)
    write_session = providers.Factory(write_session_factory)
    
    # Read Sessions (for queries)
    read_session_factory = providers.Singleton(lambda: db.read_session_factory)
    read_session = providers.Factory(read_session_factory)
    
    # Backward compatibility - deprecated
    session_factory = providers.Singleton(lambda: db.session_factory)
    
    # Authentication
    oidc_provider = providers.Singleton(
        OIDCProviderClient,
        issuer=config.oidc_issuer_url,
        client_id=config.oidc_client_id,
        client_secret=config.oidc_client_secret,
        redirect_uri=config.oidc_redirect_uri,
        audience=config.oidc_audience,
        scopes=config.oidc_scopes,
        cache_seconds=config.oidc_jwks_cache_seconds,
    )

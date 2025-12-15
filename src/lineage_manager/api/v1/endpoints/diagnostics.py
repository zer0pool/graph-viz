from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends

from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.config import get_settings
from lineage_manager.core.database import Database

try:
    from sqlalchemy.engine.url import make_url
except Exception:  # fallback if import path differs
    make_url = None


AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/diagnostics",
    tags=["diagnostics"],
    dependencies=AUTH_DEPS,
)


def _mask_url(url: str) -> str:
    if not url:
        return url
    try:
        if make_url is None:
            # Simple mask: replace :password@ with :***@
            import re

            return re.sub(r":([^:@/]+)@", ":***@", url)
        u = make_url(url)
        if u.password:
            u = u.set(password="***")
        return str(u)
    except Exception:
        return url


@router.get("/db")
@inject
def diagnostics_db():
    """Return current DB configuration (password masked) and connectivity."""
    settings = get_settings()
    masked = _mask_url(settings.database_url or "")

    # Create a short-lived Database to test connectivity using current settings
    db = Database()
    ok = db.test_connection()

    # Attempt to introspect dialect/driver from the engine
    dialect = None
    driver = None
    try:
        engine = db._engine  # type: ignore[attr-defined]
        dialect = getattr(engine.dialect, "name", None)
        driver = getattr(engine.dialect, "driver", None)
    except Exception:
        pass

    return {
        "database_url": masked,
        "dialect": dialect,
        "driver": driver,
        "echo": settings.database_echo,
        "pool": {
            "pool_size": settings.database_pool_size,
            "max_overflow": settings.database_max_overflow,
        },
        "connected": ok,
    }

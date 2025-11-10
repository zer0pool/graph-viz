import logging
from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from graph_manager.core.container import GraphContainer

logger = logging.getLogger(__name__)

# core/middleware.py
async def session_middleware(request: Request, call_next: Callable, container: GraphContainer) -> Response:
    """
    Provide a scoped SQLAlchemy Session per request and commit/rollback automatically.

    - Creates/gets a scoped_session registry from the container
    - Executes the request handler
    - Commits on success (HTTP < 400), rollbacks on error
    - Always removes the session registry at the end
    """
    session_registry = container.database().session_maker  # scoped_session registry
    # Expose on request for any ad-hoc dependency usage
    request.state.db = session_registry
    try:
        response = await call_next(request)
        # Commit on successful responses
        try:
            if getattr(response, "status_code", 500) < 400:
                session_registry.commit()
            else:
                session_registry.rollback()
        except Exception:
            # If commit fails, ensure rollback to leave connection clean
            session_registry.rollback()
            raise
        return response
    except Exception:
        # Ensure rollback on unhandled exceptions
        session_registry.rollback()
        raise
    finally:
        # Remove the scoped session (clears thread/greenlet-local)
        session_registry.remove()

def get_container_session(request: Request) -> Session:
    """
    Dependency function to get the database session from container.

    This function retrieves the session that was injected into the container
    by the middleware.

    Args:
        request: FastAPI request object

    Returns:
        Database session for the current request
    """
    # Get container from app (should be set in main.py)
    container = request.app.container
    # Return an actual Session instance from scoped registry
    return container.database().session_maker()

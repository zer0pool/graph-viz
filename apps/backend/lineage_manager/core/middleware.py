import logging
from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from lineage_manager.core.container import GraphContainer

logger = logging.getLogger(__name__)


# core/middleware.py
async def session_middleware(
    request: Request, call_next: Callable, container: GraphContainer
) -> Response:
    """
    Provide a scoped SQLAlchemy Session per request for lifecycle management.

    - Creates/gets a scoped_session registry from the container
    - Executes the request handler
    - Performs rollback on unhandled exceptions
    - Always removes the session registry at the end (cleanup)

    Note: Transaction COMMIT is handled by the Service Layer (UoW), not here.
    """
    session_registry = (
        container.core.database().session_factory
    )  # scoped_session registry
    # Expose on request for any ad-hoc dependency usage
    request.state.db = session_registry
    try:
        response = await call_next(request)
        return response
    except Exception:
        # If unhandled exception occurs, rollback to be safe
        session_registry.rollback()
        raise
    finally:
        # Always remove the scoped session to return connection to pool
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
    return container.core.database().session_factory()

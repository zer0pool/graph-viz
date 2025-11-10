import logging
from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from graph_manager.core.container import GraphContainer

logger = logging.getLogger(__name__)

# core/middleware.py
async def session_middleware(request: Request, call_next: Callable, container: GraphContainer) -> Response:
    """
    Use scoped_session to provide thread-safe sessions per request.
    """
    try:
        # Create or retrieve a session for this request
        request.state.db = container.database().session_maker
        response = await call_next(request)
        return response
    finally:
        # Remove the session (ends thread-local storage)
        container.database().session_maker.remove()

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
    return container.session()

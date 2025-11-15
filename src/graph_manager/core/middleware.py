import logging
from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from graph_manager.core.container import GraphContainer

logger = logging.getLogger(__name__)


# --------------------------
# Session management
# --------------------------
async def session_middleware(request: Request, call_next: Callable, container: GraphContainer) -> Response:
    """
    Provide a scoped SQLAlchemy Session per request and commit/rollback automatically.

    - Creates/gets a scoped_session registry from the container
    - Executes the request handler
    - Commits on success (HTTP < 400), rollbacks on error
    - Always removes the session registry at the end
    """
    session_registry = container.database().session_maker  # scoped_session registry
    request.state.db = session_registry
    try:
        response = await call_next(request)
        try:
            if getattr(response, "status_code", 500) < 400:
                session_registry.commit()
            else:
                session_registry.rollback()
        except Exception:
            session_registry.rollback()
            raise
        return response
    except Exception:
        session_registry.rollback()
        raise
    finally:
        session_registry.remove()


def get_container_session(request: Request) -> Session:
    """
    Dependency function to get the database session from container.

    Returns:
        Database session for the current request
    """
    container = request.app.container
    return container.database().session_maker()


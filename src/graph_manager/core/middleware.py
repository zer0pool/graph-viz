import logging
from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from graph_manager.core.container import GraphContainer

logger = logging.getLogger(__name__)


async def session_middleware(
    request: Request, call_next: Callable, container: GraphContainer
) -> Response:
    """
    Core middleware to manage database sessions per request using container pattern.

    This middleware:
    1. Creates a new database session for each request
    2. Injects the session into the container for the duration of the request
    3. Ensures proper transaction commit/rollback
    4. Cleans up the session after request completion

    This is infrastructure-level middleware that manages the dependency injection
    container and should be located in the core module.
    """
    # Create database session for this request
    session: Session = container.session_factory()()

    try:
        # Inject session into container for this request using override
        container.session.override(session)
        logger.debug("Session injected into container for request")

        # Process the request
        response = await call_next(request)

        # Commit transaction if successful
        session.commit()
        logger.debug("Transaction committed successfully")

        return response

    except Exception as e:
        # Rollback on error
        session.rollback()
        logger.error(f"Transaction rolled back due to error: {e}")
        raise

    finally:
        # Always clean up: reset container override and close session
        try:
            container.session.reset_override()
        except:
            pass  # Ignore if already reset
        session.close()
        logger.debug("Session cleaned up and container reset")


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

from typing import Callable

from fastapi import Request, Response
from sqlalchemy.orm import Session

from lineage_manager.core.database import db


async def session_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware to manage database sessions per request.

    - Creates a new database session for each request
    - Stores the session in request.state for use in endpoints
    - Ensures proper session cleanup after request completion
    """
    # Create database session for this request using the session factory directly
    session: Session = db.session_factory()

    try:
        # Store session in request state for use in endpoints
        request.state.db_session = session

        # Process the request
        response = await call_next(request)

        # Commit transaction if successful
        session.commit()

        return response

    except Exception:
        # Rollback on error
        session.rollback()
        raise

    finally:
        # Always close the session
        db.session_factory.remove()


def get_db_session(request: Request) -> Session:
    """
    Dependency function to get the database session from request state.

    Args:
        request: FastAPI request object

    Returns:
        Database session for the current request
    """
    return request.state.db_session

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, func

from .base import Base
from enum import StrEnum


class UserRole(StrEnum):
    VIEWER = "Viewer"
    ADMIN = "Admin"
    OPERATOR = "Operator"


class UserAccount(Base):
    """
    Stores authenticated user profiles sourced from the OIDC provider.
    """

    __tablename__ = "user_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub = Column(String(255), nullable=False, unique=True, index=True)

    # New/Renamed columns
    login_id = Column(
        String(255), nullable=True, unique=True, index=True
    )  # Renamed from loginId
    email = Column(String(255), nullable=True, index=True)
    name = Column(String(255), nullable=True)
    roles = Column(JSON, nullable=True, default=[UserRole.VIEWER])
    department = Column(String(255), nullable=True)  # Renamed from dept
    status = Column(String(20), default="ACTIVE", nullable=True)  # New column
    user_id = Column(String(100), unique=True, index=True, nullable=False)  # New column

    last_login_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def touch_login(self):
        self.last_login_at = datetime.utcnow()

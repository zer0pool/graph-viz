from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, func

from .base import Base
from enum import StrEnum

class UserRole(StrEnum):
    VIEWER = "Viewer"
    ADMIN = "Admin"
    OPERATOR = "Operator"


class GraphUserAccount(Base):
    """
    Stores authenticated user profiles sourced from the OIDC provider.
    """

    __tablename__ = "graph_user_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub = Column(String(255), nullable=False, unique=True, index=True)
    loginId = Column(String(255), nullable=True, unique=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    name = Column(String(255), nullable=True)
    roles = Column(JSON, nullable=True, default=[UserRole.VIEWER])
    dept = Column(String(255), nullable=True)
    last_login_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def touch_login(self):
        self.last_login_at = datetime.utcnow()

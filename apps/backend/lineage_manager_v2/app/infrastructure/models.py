from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import relationship

from app.domain.audit.models import AuditLog
from app.infrastructure.base import Base


class GraphNode(Base):
    """Base table for all nodes in the graph."""

    __tablename__ = "graph_node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    node_type = Column(String(50), nullable=False)  # 'job', 'table', etc.
    name = Column(String(500), nullable=False)  # FQN or label
    properties = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("node_type", "name", name="uq_graph_node_type_name"),
    )

    # Polymorphic-ish relationships
    job_details = relationship(
        "JobNode", back_populates="node", uselist=False, cascade="all, delete-orphan"
    )
    data_details = relationship(
        "DataNode", back_populates="node", uselist=False, cascade="all, delete-orphan"
    )


class GraphEdge(Base):
    """Lineage or trigger relationships between nodes."""

    __tablename__ = "graph_edge"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), nullable=False
    )
    target_node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), nullable=False
    )
    edge_type = Column(String(20), nullable=False)  # 'dependency', 'produces', etc.
    trigger = Column(Boolean, server_default=text("0"), nullable=True)
    properties = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "source_node_id",
            "target_node_id",
            "edge_type",
            name="uq_graph_edge_source_target_type",
        ),
    )


class GraphClosure(Base):
    """Transitive closure for graph traversal optimization."""

    __tablename__ = "graph_closure"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ancestor_id = Column(Integer, nullable=False)
    descendant_id = Column(Integer, nullable=False)
    depth = Column(Integer, nullable=False)
    path = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "ancestor_id", "descendant_id", "depth", name="uq_graph_closure"
        ),
    )


class JobNode(Base):
    """Extended attributes for job-type nodes."""

    __tablename__ = "job_node"

    node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True
    )
    job_id = Column(String(500), nullable=False, unique=True)
    project_id = Column(String(100), nullable=False)
    owners = Column(JSON, nullable=True)  # Legacy list or cache
    properties = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    node = relationship("GraphNode", back_populates="job_details")


class DataNode(Base):
    """Extended attributes for table/dataset nodes."""

    __tablename__ = "data_node"

    node_id = Column(
        Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True
    )
    data_id = Column(String(500), nullable=False, unique=True)
    data_type = Column(String(50), nullable=False)
    data_info = Column(JSON, nullable=True)

    node = relationship("GraphNode", back_populates="data_details")


class Project(Base):
    __tablename__ = "project"

    project_id = Column(String(100), primary_key=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    business_unit = Column(String(100), nullable=True, index=True)
    status = Column(String(20), server_default="ACTIVE", nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class UserAccount(Base):
    __tablename__ = "user_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sub = Column(String(255), nullable=False, unique=True)
    login_id = Column(String(255), unique=True, index=True)
    email = Column(String(255), index=True)
    name = Column(String(255))
    roles = Column(JSON, nullable=True)
    department = Column(String(255))
    status = Column(String(20), server_default="ACTIVE")
    user_id = Column(String(100), nullable=False, unique=True, index=True)
    last_login_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PageVisit(Base):
    """Records each page view event from the frontend."""

    __tablename__ = "page_visit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    path = Column(String(500), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    visitor_id = Column(String(255), nullable=True)
    visited_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class ApiAccessLog(Base):
    """Records every HTTP API call across all backend services."""

    __tablename__ = "api_access_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(64), nullable=False)
    user_id = Column(String(100), nullable=True)
    service = Column(String(20), nullable=False)   # 'lineage' | 'analytics'
    method = Column(String(10), nullable=False)
    path = Column(String(500), nullable=False)
    status_code = Column(SmallInteger, nullable=False)
    duration_ms = Column(Integer, nullable=False)
    ip_address = Column(String(45), nullable=True)  # supports IPv6
    requested_at = Column(DateTime(timezone=False), nullable=False)

    __table_args__ = (
        Index("idx_api_access_log_user_id", "user_id"),
        Index("idx_api_access_log_path", "path"),
        Index("idx_api_access_log_requested_at", "requested_at"),
        Index("idx_api_access_log_request_id", "request_id"),
    )

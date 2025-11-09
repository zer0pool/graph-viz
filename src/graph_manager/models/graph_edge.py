from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphEdge(Base):
    """
    그래프 내 노드 간의 직접적인 관계 (Edge)
    Job-to-Job, Table-to-Table 등 다양한 관계 표현
    """

    __tablename__ = "graph_edge"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Edge의 시작과 끝 노드 ID (Integer-based for performance)
    source_node_id = Column(Integer, nullable=False)
    target_node_id = Column(Integer, nullable=False)

    # 소스 노드 타입 ('job' 또는 'table')
    source_node_type = Column(String(10), nullable=False)

    # 타겟 노드 타입 ('job' 또는 'table')
    target_node_type = Column(String(10), nullable=False)

    # 관계 타입 ('dependency', 'data_flow', 'triggers' 등)
    edge_type = Column(String(50), nullable=False)

    # 관계에 대한 레이블 정보
    labels = Column(JSON, nullable=True)

    # 활성화 여부
    is_trigger_on = Column(Boolean, default=True)

    # Readability fields for human-readable identification
    source_job_id = Column(String(255), nullable=True)  # Human-readable job ID
    source_table_name = Column(String(255), nullable=True)  # Human-readable table name
    target_job_id = Column(String(255), nullable=True)  # Human-readable job ID
    target_table_name = Column(String(255), nullable=True)  # Human-readable table name

    created_at = Column(DateTime, server_default="now()")
    updated_at = Column(DateTime, server_default="now()")

    __table_args__ = (
        UniqueConstraint(
            "source_node_id", "target_node_id", "edge_type", name="uq_edge_relation"
        ),
    )

    def __repr__(self):
        return (
            f"<GraphEdge(source={self.source_node_type}:{self.source_node_id}, "
            f"target={self.target_node_type}:{self.target_node_id}, type={self.edge_type})>"
        )

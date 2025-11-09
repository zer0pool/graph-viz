from sqlalchemy import JSON, Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphClosure(Base):
    """
    그래프의 전이적 관계를 효율적으로 조회하기 위한 클로저 테이블
    ancestor와 descendant 간의 모든 경로 관계 저장
    """

    __tablename__ = "graph_closure"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 조상 노드 ID (Integer-based for performance)
    ancestor_id = Column(Integer, nullable=False)

    # 자손 노드 ID (Integer-based for performance)
    descendant_id = Column(Integer, nullable=False)

    # 조상 노드 타입
    ancestor_type = Column(String(10), nullable=False)

    # 자손 노드 타입
    descendant_type = Column(String(10), nullable=False)

    # 깊이 (조상으로부터의 거리)
    depth = Column(Integer, nullable=False, default=0)

    # 경로 정보 (선택적: 경로 추적을 위한 메타데이터)
    path_info = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default="now()")
    updated_at = Column(DateTime, server_default="now()")

    __table_args__ = (
        UniqueConstraint(
            "ancestor_id", "descendant_id", "depth", name="uq_closure_path"
        ),
    )

    def __repr__(self):
        return (
            f"<GraphClosure(ancestor={self.ancestor_type}:{self.ancestor_id}, "
            f"descendant={self.descendant_type}:{self.descendant_id}, depth={self.depth})>"
        )

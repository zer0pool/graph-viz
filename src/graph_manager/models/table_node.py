from sqlalchemy import JSON, Column, DateTime, Integer, String, func
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphTableNode(Base):
    """
    그래프 내 Table 노드 (데이터 객체)
    예: BigQuery 테이블, 뷰 등
    """

    __tablename__ = "graph_table_node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(
        String(255), nullable=False, unique=True
    )  # ex: project.dataset.table
    project_name = Column(String(100), nullable=True)
    dataset_name = Column(String(100), nullable=True)
    table_name = Column(String(100), nullable=True)

    # Additional fields from legacy GraphNode for table nodes
    labels = Column(JSON, nullable=True)  # Labels for table node (JSON format)

    # Table/Storage specific fields
    storage_type = Column(String(50), nullable=True)  # "s3", "database", etc.
    storage_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<GraphTableNode(id={self.id}, name={self.full_name})>"

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphJobNode(Base):
    """
    그래프 내 Job 노드 (작업 메타데이터)
    예: BigQuery SQL 실행, ETL Task 등
    """

    __tablename__ = "graph_job_node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(
        String(255), nullable=False, unique=True
    )  # Unique identifier for the job
    name = Column(String(255), nullable=True)  # Representative name, can be anything

    owner = Column(String(100), nullable=True)

    # Additional fields from legacy GraphNode
    labels = Column(JSON, nullable=True)

    # Job Manager specific fields
    write_mode = Column(String(20), nullable=True)
    destination_type = Column(String(20), nullable=True)
    destination_table = Column(String(500), nullable=True)

    trigger_tables = Column(JSON, nullable=True)  # List of trigger tables
    reference_tables = Column(JSON, nullable=True)  # List of reference tables

    # Additional metadata as JSON
    job_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<GraphJobNode(id={self.id}, job_id={self.job_id}, name={self.name})>"

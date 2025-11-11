from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import declarative_base

from .base import Base


class GraphJobTableLink(Base):
    """
    Job ↔ Table 간의 입출력 관계를 나타내는 링크 테이블
    """

    __tablename__ = "graph_job_table_link"

    id = Column(Integer, primary_key=True, autoincrement=True)

    job_id = Column(
        Integer, nullable=False
    )  # Integer job_id for performance (references GraphJobNode.id)
    table_id = Column(
        Integer, nullable=False
    )  # Integer table_id for performance (references GraphTableNode.id)

    # 'input' 또는 'output'
    io_type = Column(String(10), nullable=False)

    created_at = Column(DateTime, server_default="now()")
    updated_at = Column(DateTime, server_default="now()")

    __table_args__ = (
        UniqueConstraint("job_id", "table_id", "io_type", name="uq_job_table_io"),
    )

    def __repr__(self):
        return (
            f"<GraphJobTableLink(job_id={self.job_id}, "
            f"table_id={self.table_id}, io_type={self.io_type})>"
        )

from sqlalchemy import JSON, Column, DateTime, Integer, UniqueConstraint, func

from .base import Base


class GraphClosure(Base):
    """Transitive closure for graph traversal."""

    __tablename__ = "graph_closure"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ancestor_id = Column(Integer, nullable=False)
    descendant_id = Column(Integer, nullable=False)
    depth = Column(Integer, nullable=False, default=0)
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

    def __repr__(self):
        return f"<GraphClosure(ancestor={self.ancestor_id}, descendant={self.descendant_id}, depth={self.depth})>"

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class GraphNode(Base):
    """
    Lightweight Graph Node.
    optimization: Contains NO metadata. Purely for structure.
    """
    __tablename__ = "graph_node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    node_type = Column(String(50), nullable=False, index=True) # 'JOB', 'TABLE', etc.
    name = Column(String(500), nullable=False) # FQN (e.g. 'project.dataset.table')
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('name', 'node_type', name='uq_graph_node_name_type'),
    )

class GraphEdge(Base):
    """
    Strict Integer-only Edge for high-performance traversal.
    """
    __tablename__ = "graph_edge"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), nullable=False, index=True)
    
    edge_type = Column(String(20), nullable=False) # 'LINEAGE', 'TRIGGER', etc.
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        # Composite Index for O(log N) lookup in both directions if covered index is supported, 
        # but at least Unique constraint ensures integrity.
        UniqueConstraint('source_id', 'target_id', 'edge_type', name='uq_graph_edge_src_dst_type'),
        # Index on target_id is critical for reverse (upstream) traversal.
        # Check if DB automatically creates index for FK. explicit is safer.
        Index('ix_graph_edge_target_source', 'target_id', 'source_id'),
    )

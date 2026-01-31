from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func, UniqueConstraint
from sqlalchemy.orm import relationship, backref
from app.db.base import Base

class Table(Base):
    """
    Heavy Leaf Node for Tables/Datasets.
    """
    __tablename__ = "table_metadata" # Avoid reserved word 'table'

    # One-to-One relationship with GraphNode
    node_id = Column(Integer, ForeignKey("graph_node.id", ondelete="CASCADE"), primary_key=True)
    
    dataset_name = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    
    # Schema info
    schema_definition = Column(JSON, nullable=True) # List of columns {name, type}
    storage_format = Column(String(50), nullable=True) # PARQUET, AVRO
    location = Column(String(500), nullable=True) # s3://...
    
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    node = relationship("app.domain.graph.models.GraphNode", backref=backref("table_meta", uselist=False))

    __table_args__ = (
        UniqueConstraint('dataset_name', 'table_name', name='uq_table_dataset_name'),
    )

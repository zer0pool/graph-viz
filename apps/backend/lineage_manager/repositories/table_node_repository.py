"""Table node repository."""

from typing import Optional

from sqlalchemy.orm import Session

from lineage_manager.models.table_node import TableNode
from lineage_manager.repositories.base_repository import BaseRepository


class TableNodeRepository(BaseRepository):
    """Repository for Table node operations."""
    
    def __init__(self, session: Session):
        super().__init__(session, TableNode)
    
    def get_by_node_id(self, node_id: int) -> Optional[TableNode]:
        """Get table node by node ID."""
        return self.session.query(TableNode).filter_by(node_id=node_id).first()
    
    def get_by_dataset_table(self, dataset: str, table_name: str) -> Optional[TableNode]:
        """Get table node by dataset and table name."""
        return (
            self.session.query(TableNode)
            .filter_by(dataset=dataset, table_name=table_name)
            .first()
        )
    
    def create_or_update(
        self, 
        node_id: int, 
        dataset: str, 
        table_name: str, 
        properties: dict = None
    ) -> TableNode:
        """Create or update table node data."""
        existing = self.get_by_node_id(node_id)
        
        if existing:
            # Update
            existing.dataset = dataset
            existing.table_name = table_name
            if properties is not None:
                existing.properties = properties
            self.session.flush()
            return existing
        else:
            # Create
            table_node = TableNode(
                node_id=node_id,
                dataset=dataset,
                table_name=table_name,
                properties=properties or {}
            )
            self.session.add(table_node)
            self.session.flush()
            return table_node

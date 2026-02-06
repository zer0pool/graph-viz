"""Data node repository."""

from typing import Optional

from sqlalchemy.orm import Session

from lineage_manager.models.data_node import DataNode
from lineage_manager.repositories.base_repository import BaseRepository


class DataNodeRepository(BaseRepository):
    """Repository for Data node operations (BigQuery, S3, GCS, etc)."""

    def __init__(self, session: Session):
        super().__init__(session, DataNode)

    def get_by_node_id(self, node_id: int) -> Optional[DataNode]:
        """Get data node by node ID."""
        return self.session.query(DataNode).filter_by(node_id=node_id).first()

    def get_by_data_id(self, data_id: str) -> Optional[DataNode]:
        """Get data node by unique data ID (FQN)."""
        return self.session.query(DataNode).filter_by(data_id=data_id).first()

    def create_or_update(
        self, node_id: int, data_id: str, data_type: str, data_info: dict = None
    ) -> DataNode:
        """Create or update data node."""
        existing = self.get_by_node_id(node_id)

        if existing:
            # Update
            existing.data_id = data_id
            existing.data_type = data_type
            if data_info is not None:
                existing.data_info = data_info
            self.session.flush()
            return existing
        else:
            # Create
            data_node = DataNode(
                node_id=node_id,
                data_id=data_id,
                data_type=data_type,
                data_info=data_info or {},
            )
            self.session.add(data_node)
            self.session.flush()
            return data_node

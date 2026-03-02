from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.metadata.entities.resource import ResourceMetadata
from app.infrastructure.models import DataNode, GraphNode


class DataNodeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_fqn(self, fqn: str) -> Optional[ResourceMetadata]:
        query = (
            select(DataNode)
            .join(GraphNode, GraphNode.id == DataNode.node_id)
            .where(DataNode.data_id == fqn)
        )
        result = await self.db.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model, model.data_info.get("project", "unknown"))

    async def search_by_prefix(
        self, prefix: str, limit: int = 10
    ) -> List[ResourceMetadata]:
        query = (
            select(DataNode).where(DataNode.data_id.ilike(f"%{prefix}%")).limit(limit)
        )
        result = await self.db.execute(query)
        models = result.scalars().all()
        return [
            self._to_entity(m, m.data_info.get("project", "unknown")) for m in models
        ]

    async def save(self, entity: ResourceMetadata) -> ResourceMetadata:
        # 1. Ensure GraphNode exists
        # Use data_type.lower() as the node_type (e.g. 'table', 'storage')
        node_cat = entity.data_type.lower()
        node_query = select(GraphNode).where(
            GraphNode.node_type == node_cat, GraphNode.name == entity.fqn
        )
        node_result = await self.db.execute(node_query)
        node_model = node_result.scalar_one_or_none()

        if not node_model:
            node_model = GraphNode(node_type=node_cat, name=entity.fqn)
            self.db.add(node_model)
            await self.db.flush()

        # 2. Upsert DataNode
        data_node_query = select(DataNode).where(DataNode.node_id == node_model.id)
        data_node_result = await self.db.execute(data_node_query)
        data_node_model = data_node_result.scalar_one_or_none()

        # In V2, we might want to distinguish between BIGQUERY/S3 here
        # For now, stay consistent with existing data_type
        if data_node_model:
            data_node_model.data_id = entity.fqn
            data_node_model.data_type = entity.data_type
            data_node_model.data_info = {
                **entity.schema_info,
                "project": entity.project_id,
            }
        else:
            data_node_model = DataNode(
                node_id=node_model.id,
                data_id=entity.fqn,
                data_type=entity.data_type,
                data_info={**entity.schema_info, "project": entity.project_id},
            )
            self.db.add(data_node_model)

        await self.db.flush()
        await self.db.refresh(data_node_model)
        return self._to_entity(data_node_model, entity.project_id)

    async def count(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count()).select_from(DataNode))
        return result.scalar() or 0

    def _to_entity(self, model: DataNode, project_id: str) -> ResourceMetadata:
        return ResourceMetadata(
            id=model.node_id,
            project_id=project_id,
            fqn=model.data_id,
            data_type=model.data_type,
            schema_info=model.data_info,
            properties=model.data_info,
            created_at=getattr(model, "created_at", None),
            updated_at=getattr(model, "updated_at", None),
        )

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from app.domain.graph.entities.job_node import JobNode as JobEntity
from app.infrastructure.models import GraphNode, JobNode


class JobRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, job_id: str) -> Optional[JobEntity]:
        # Join JobNode with GraphNode to get name
        query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .where(JobNode.job_id == job_id)
        )
        result = await self.db.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            return None

        return self._to_entity(model, model.owners or [])

    async def save(self, entity: JobEntity) -> JobEntity:
        # 1. Ensure GraphNode exists
        node_query = select(GraphNode).where(
            GraphNode.node_type == "job", GraphNode.name == entity.name
        )
        node_result = await self.db.execute(node_query)
        node_model = node_result.scalar_one_or_none()

        if not node_model:
            node_model = GraphNode(node_type="job", name=entity.name)
            self.db.add(node_model)
            await self.db.flush()

        # 2. Upsert JobNode
        job_node_query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .where(JobNode.node_id == node_model.id)
        )
        job_node_result = await self.db.execute(job_node_query)
        job_node_model = job_node_result.scalar_one_or_none()

        # Use entity.job_id or business logic
        job_id_val = entity.job_id or f"{entity.project_id}.{entity.name}"

        if job_node_model:
            job_node_model.job_id = job_id_val
            job_node_model.project_id = entity.project_id
            job_node_model.properties = entity.properties
            job_node_model.owners = entity.owners
        else:
            job_node_model = JobNode(
                node_id=node_model.id,
                job_id=job_id_val,
                project_id=entity.project_id,
                properties=entity.properties,
                owners=entity.owners,
            )
            self.db.add(job_node_model)

        await self.db.flush()
        await self.db.refresh(job_node_model)
        return self._to_entity(job_node_model, entity.owners, node_model.name)

    async def list_by_project(self, project_id: str) -> List[JobEntity]:
        query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .where(JobNode.project_id == project_id)
        )
        result = await self.db.execute(query)
        models = result.scalars().all()

        return [self._to_entity(m, m.owners or []) for m in models]

    async def list_by_owner(self, user_id: str) -> List[JobEntity]:
        # Filter by owner in the JSON list using MySQL JSON_CONTAINS
        # user_id must be a JSON string for matching, so we wrap it in double quotes
        quoted_user_id = f'"{user_id}"'
        query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .where(func.json_contains(JobNode.owners, quoted_user_id))
        )
        result = await self.db.execute(query)
        models = result.scalars().all()

        return [self._to_entity(m, m.owners or []) for m in models]

    async def count(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(JobNode))
        return result.scalar() or 0

    def _to_entity(
        self, model: JobNode, owners: List[str], name: Optional[str] = None
    ) -> JobEntity:
        # Prioritize passed name, then loaded node name, then job_id suffix
        entity_name = name
        if not entity_name:
            if hasattr(model, "node") and model.node:
                entity_name = model.node.name
            else:
                entity_name = model.job_id.split(".")[-1]

        return JobEntity(
            id=model.node_id,
            job_id=model.job_id,
            project_id=model.project_id,
            name=entity_name,
            owners=owners,
            properties=model.properties or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

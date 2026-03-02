from typing import Any, Dict, List, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
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

    async def get_batch(self, job_ids: List[str]) -> List[JobEntity]:
        """Fetch multiple jobs by their job_id in one query."""
        if not job_ids:
            return []

        query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .where(JobNode.job_id.in_(job_ids))
        )
        result = await self.db.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m, m.owners or []) for m in models]

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
        job_id_val = entity.job_id or f"{entity.project_id}-{entity.name}"

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

    async def search_by_prefix(self, prefix: str, limit: int = 10) -> List[JobEntity]:
        query = (
            select(JobNode)
            .options(selectinload(JobNode.node))
            .join(GraphNode, GraphNode.id == JobNode.node_id)
            .where(
                (JobNode.job_id.ilike(f"%{prefix}%"))
                | (GraphNode.name.ilike(f"%{prefix}%"))
            )
            .limit(limit)
        )
        result = await self.db.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m, m.owners or []) for m in models]

    async def count(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(JobNode))
        return result.scalar() or 0

    async def count_by_type(self) -> Dict[str, int]:
        """Get distribution of jobs by type stored in properties JSON."""
        # Use JSON_UNQUOTE(JSON_EXTRACT(...)) style for MySQL
        type_field = func.json_unquote(func.json_extract(JobNode.properties, "$.type"))
        stmt = select(type_field, func.count(JobNode.node_id)).group_by(type_field)
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all() if row[0]}

    async def count_by_department(self) -> Dict[str, int]:
        """Get distribution of jobs by owner department."""
        from app.infrastructure.models import UserAccount

        # Join UserAccount on JobNode.owners (JSON list of user_ids)
        stmt = (
            select(UserAccount.department, func.count(func.distinct(JobNode.node_id)))
            .join(
                UserAccount,
                func.json_contains(
                    JobNode.owners, func.json_quote(UserAccount.user_id)
                ),
            )
            .group_by(UserAccount.department)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all() if row[0]}

    async def count_by_owner(self) -> Dict[str, int]:
        """Get distribution of jobs by individual owner name."""
        from app.infrastructure.models import UserAccount

        stmt = (
            select(UserAccount.name, func.count(func.distinct(JobNode.node_id)))
            .join(
                UserAccount,
                func.json_contains(
                    JobNode.owners, func.json_quote(UserAccount.user_id)
                ),
            )
            .group_by(UserAccount.name)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all() if row[0]}

    async def count_by_created_month(self) -> List[Dict[str, Any]]:
        """Get job counts aggregated by month and year."""
        # SQLite vs MySQL date formatting
        # For SQLite: strftime('%Y-%m', created_at)
        # For MySQL: DATE_FORMAT(created_at, '%Y-%m')
        # We'll use extract for cross-compatibility if possible, or specialized for SQLite/MySQL.
        # Since this project seems to use SQLite locally (based on previous logs) but might use MySQL elsewhere,
        # I'll use extract.

        year = func.extract("year", JobNode.created_at)
        month = func.extract("month", JobNode.created_at)

        stmt = (
            select(year, month, func.count(JobNode.node_id))
            .group_by(year, month)
            .order_by(year.desc(), month.desc())
        )
        result = await self.db.execute(stmt)
        return [
            {"year": int(row[0]), "month": int(row[1]), "count": int(row[2])}
            for row in result.all()
            if row[0] is not None
        ]

    def _to_entity(
        self, model: JobNode, owners: List[str], name: Optional[str] = None
    ) -> JobEntity:
        # Prioritize passed name, then loaded node name, then job_id suffix
        entity_name = name
        if not entity_name:
            if hasattr(model, "node") and model.node:
                entity_name = model.node.name
            else:
                entity_name = model.job_id.split("-")[-1]

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

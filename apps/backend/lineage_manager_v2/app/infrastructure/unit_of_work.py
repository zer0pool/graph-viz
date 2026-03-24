from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.infrastructure.repositories.data_node_repository import DataNodeRepository
from app.infrastructure.repositories.graph_repository import GraphRepository
from app.infrastructure.repositories.job_repository import JobRepository
from app.infrastructure.repositories.page_visit_repository import PageVisitRepository
from app.infrastructure.repositories.project_repository import ProjectRepository
from app.infrastructure.repositories.user_repository import UserRepository


class UnitOfWork:
    def __init__(self, session_factory=AsyncSessionLocal):
        self.session_factory = session_factory
        self.session: Optional[AsyncSession] = None

    async def __aenter__(self):
        # If session already exists (e.g. from a mock/test), don't create a new one
        if self.session is None:
            self.session = self.session_factory()
            self._own_session = True
        else:
            self._own_session = False

        # Initialize Repositories
        self.projects = ProjectRepository(self.session)
        self.users = UserRepository(self.session)
        self.jobs = JobRepository(self.session)
        self.audits = AuditRepository(self.session)
        self.data_nodes = DataNodeRepository(self.session)
        self.graph = GraphRepository(self.session)
        self.page_visits = PageVisitRepository(self.session)

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.rollback()
        else:
            await self.commit()

        if getattr(self, "_own_session", True):
            await self.session.close()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()


async def get_uow():
    async with UnitOfWork() as uow:
        yield uow

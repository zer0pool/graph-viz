from typing import List, Optional
from app.infrastructure.unit_of_work import UnitOfWork
from app.domain.project.entities import Project
from app.domain.graph.entities.job_node import JobNode as Job
from app.domain.metadata.entities.resource import ResourceMetadata as Resource
from app.domain.user.entities import User


class MetadataService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    # --- Projects ---
    async def create_project(self, project: Project) -> Project:
        async with self.uow:
            saved = await self.uow.projects.save(project)
            await self.uow.commit()
            return saved

    async def list_projects(self) -> List[Project]:
        async with self.uow:
            return await self.uow.projects.list_all()

    async def get_project(self, project_id: str) -> Optional[Project]:
        async with self.uow:
            return await self.uow.projects.get(project_id)

    # --- Jobs ---
    async def create_job(self, job: Job) -> Job:
        async with self.uow:
            saved = await self.uow.jobs.save(job)
            await self.uow.commit()
            return saved

    async def get_job(self, job_id: str) -> Optional[Job]:
        async with self.uow:
            return await self.uow.jobs.get_by_id(job_id)

    async def get_jobs_batch(self, job_ids: List[str]) -> List[Job]:
        async with self.uow:
            return await self.uow.jobs.get_batch(job_ids)

    async def list_jobs_by_project(self, project_id: str) -> List[Job]:
        async with self.uow:
            return await self.uow.jobs.list_by_project(project_id)

    async def list_jobs_by_owner(self, user_id: str) -> List[Job]:
        async with self.uow:
            return await self.uow.jobs.list_by_owner(user_id)

    # --- Resources (Tables/Storage) ---
    async def create_resource(self, resource: Resource) -> Resource:
        async with self.uow:
            saved = await self.uow.data_nodes.save(resource)
            await self.uow.commit()
            return saved

    async def get_resource(self, fqn: str) -> Optional[Resource]:
        async with self.uow:
            return await self.uow.data_nodes.get_by_fqn(fqn)

    # --- Users ---
    async def get_user(self, user_id: str) -> Optional[User]:
        async with self.uow:
            return await self.uow.users.get_by_user_id(user_id)

    async def list_users_by_project(self, project_id: str) -> List[User]:
        async with self.uow:
            return await self.uow.users.list_by_project(project_id)

    async def list_users(self, limit: int = 10, offset: int = 0):
        async with self.uow:
            users = await self.uow.users.list_all(limit, offset)
            total = await self.uow.users.count()
            return users, total

    async def get_user_detail(self, user_id: str):
        async with self.uow:
            user = await self.uow.users.get_by_user_id(user_id)
            if not user:
                return None
            
            # Derive counts from jobs
            jobs = await self.uow.jobs.list_by_owner(user_id)
            project_ids = {j.project_id for j in jobs}
            
            return {
                "user": user,
                "summary": {
                    "owned_jobs": len(jobs),
                    "project_count": len(project_ids)
                }
            }

    async def list_user_projects(self, user_id: str) -> List[Project]:
        async with self.uow:
            jobs = await self.uow.jobs.list_by_owner(user_id)
            project_ids = {j.project_id for j in jobs}
            projects = []
            for pid in project_ids:
                p = await self.uow.projects.get(pid)
                if p:
                    projects.append(p)
            return projects

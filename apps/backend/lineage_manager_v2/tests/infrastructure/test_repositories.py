import pytest
from app.infrastructure.unit_of_work import UnitOfWork
from app.domain.project.entities import Project as ProjectEntity
from app.domain.user.entities import User as UserEntity
from app.domain.graph.entities.job_node import JobNode as JobEntity


@pytest.mark.asyncio
async def test_project_repository_save_and_get(session):
    # session is provided by conftest.py, we'll wrap it in UoW for consistency
    async with UnitOfWork(session_factory=lambda: session) as uow:
        project = ProjectEntity(
            project_id="test-proj",
            display_name="Test Project",
            description="Testing uow",
        )
        saved_project = await uow.projects.save(project)
        await uow.commit()  # UnitOfWork.__aexit__ also commits if no error, but explicit is fine

    async with UnitOfWork(session_factory=lambda: session) as uow:
        retrieved = await uow.projects.get("test-proj")
        assert retrieved is not None
        assert retrieved.display_name == "Test Project"


@pytest.mark.asyncio
async def test_user_repository_save_and_get(session):
    async with UnitOfWork(session_factory=lambda: session) as uow:
        user = UserEntity(
            user_id="user-123",
            sub="sub-abc",
            email="test@example.com",
            name="Test User",
        )
        await uow.users.save(user)
        await uow.commit()

    async with UnitOfWork(session_factory=lambda: session) as uow:
        retrieved = await uow.users.get_by_user_id("user-123")
        assert retrieved is not None
        assert retrieved.name == "Test User"
        assert retrieved.email == "test@example.com"


@pytest.mark.asyncio
async def test_job_repository_save_and_get(session):
    async with UnitOfWork(session_factory=lambda: session) as uow:
        # Job preservation requires a project for valid job_id generation logic if we use the property
        job = JobEntity(
            id=None,
            project_id="test-proj",
            name="test-job",
            owners=["user-123"],
            properties={"type": "python", "job_id": "manual-id-1"},
        )
        await uow.jobs.save(job)
        await uow.commit()

    async with UnitOfWork(session_factory=lambda: session) as uow:
        # Retrieval uses the UK job_id
        retrieved = await uow.jobs.get_by_id("manual-id-1")
        assert retrieved is not None
        assert retrieved.name == "test-job"
        assert "user-123" in retrieved.owners


@pytest.mark.asyncio
async def test_uow_rollback_on_error(session):
    try:
        async with UnitOfWork(session_factory=lambda: session) as uow:
            project = ProjectEntity(
                project_id="fail-proj", display_name="Should Not Exist"
            )
            await uow.projects.save(project)
            raise ValueError("Forced error")
    except ValueError:
        pass

    async with UnitOfWork(session_factory=lambda: session) as uow:
        retrieved = await uow.projects.get("fail-proj")
        assert retrieved is None

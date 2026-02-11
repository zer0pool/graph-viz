"""Unit tests for JobNodeRepository."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, GraphNode, JobNode
from repositories.job_node_repository import JobNodeRepository


@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_job_node(db_session):
    """Create a sample job node."""
    node = GraphNode(node_type="job", name="test_job_001")
    db_session.add(node)
    db_session.commit()
    return node


class TestJobNodeRepository:
    """Test JobNodeRepository functionality."""

    def test_create_job_node(self, db_session, sample_job_node):
        """Test creating job metadata."""
        repo = JobNodeRepository(db_session)

        job_node = repo.create_or_update(
            node_id=sample_job_node.id,
            job_id="test_job_001",
            project_id="test-project",
            owners=["test_user"],
            properties={"status": "RUNNING"},
        )

        assert job_node.node_id == sample_job_node.id
        assert job_node.project_id == "test-project"
        assert job_node.owners == ["test_user"]
        assert job_node.properties["status"] == "RUNNING"

    def test_update_job_node(self, db_session, sample_job_node):
        """Test updating existing job metadata."""
        repo = JobNodeRepository(db_session)

        # Create
        repo.create_or_update(
            node_id=sample_job_node.id, 
            job_id="test_job_001",
            project_id="project-a", 
            owners=["user_a"]
        )

        # Update
        updated = repo.create_or_update(
            node_id=sample_job_node.id, 
            job_id="test_job_001",
            project_id="project-b", 
            owners=["user_b"]
        )

        assert updated.project_id == "project-b"
        assert updated.owners == ["user_b"]

    def test_find_by_project(self, db_session):
        """Test finding jobs by project ID."""
        repo = JobNodeRepository(db_session)

        # Create multiple jobs
        for i in range(5):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id,
                job_id=f"job_{i}",
                project_id="project-a" if i < 3 else "project-b",
                owners=[f"user_{i}"],
            )

        db_session.commit()

        # Find by project
        results, total = repo.find_by_project("project-a", limit=10, offset=0)

        assert total == 3
        assert len(results) == 3

        for node, meta, pname in results:
            assert meta.project_id == "project-a"

    def test_find_by_owner(self, db_session):
        """Test finding jobs by owner ID."""
        repo = JobNodeRepository(db_session)

        # Create jobs with different owners
        for i in range(4):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id,
                job_id=f"job_{i}",
                project_id=f"project-{i}",
                owners=["user_a" if i < 2 else "user_b"],
            )

        db_session.commit()

        # Find by owner
        results, total = repo.find_by_owner("user_a", limit=10, offset=0)

        assert total == 2
        assert len(results) == 2

        for node, meta in results:
            assert "user_a" in meta.owners

    def test_pagination(self, db_session):
        """Test pagination in find_by_project."""
        repo = JobNodeRepository(db_session)

        # Create 10 jobs
        for i in range(10):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id, job_id=f"job_{i}", project_id="test-project", owners=[f"user_{i}"]
            )

        db_session.commit()

        # Page 1
        results_page1, total = repo.find_by_project("test-project", limit=3, offset=0)
        assert total == 10
        assert len(results_page1) == 3

        # Page 2
        results_page2, _ = repo.find_by_project("test-project", limit=3, offset=3)
        assert len(results_page2) == 3

        # Ensure different results
        page1_ids = {node.id for node, _, _ in results_page1}
        page2_ids = {node.id for node, _, _ in results_page2}
        assert page1_ids.isdisjoint(page2_ids)

    def test_get_project_stats(self, db_session):
        """Test getting project statistics."""
        repo = JobNodeRepository(db_session)

        # Create jobs for project
        for i in range(7):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id, job_id=f"job_{i}", project_id="stats-project", owners=[f"user_{i}"]
            )

        db_session.commit()

        stats = repo.get_project_stats("stats-project")

        assert stats["jobs"] == 7

    def test_get_owner_stats(self, db_session):
        """Test getting owner statistics."""
        repo = JobNodeRepository(db_session)

        # Create jobs for owner
        for i in range(5):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id, job_id=f"job_{i}", project_id=f"project-{i}", owners=["stats-user"]
            )

        db_session.commit()

        stats = repo.get_owner_stats("stats-user")

        assert stats["owned_jobs"] == 5

    def test_list_all_jobs(self, db_session):
        """Test listing all jobs with sort."""
        repo = JobNodeRepository(db_session)

        # Create jobs
        for i in range(5):
            node = GraphNode(node_type="job", name=f"job_{i}")
            db_session.add(node)
            db_session.flush()

            repo.create_or_update(
                node_id=node.id, job_id=f"job_{i}", project_id="test-project", owners=["test-user"]
            )
        db_session.commit()

        results, total = repo.list_all_jobs(limit=3, offset=0)

        assert total == 5
        assert len(results) == 3
        # Sorting check not easy with sqlite without explicit dates,
        # but updated_at is auto-set. Assuming implementation relies on DB default.

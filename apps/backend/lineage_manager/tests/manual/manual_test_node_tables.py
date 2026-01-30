"""
Standalone test script for search/metadata tables functionality.
Run with: python3 tests/manual/test_node_tables.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from lineage_manager.models import Base, GraphNode, JobNode, Project
from lineage_manager.repositories.job_node_repository import JobNodeRepository
from lineage_manager.repositories.project_repository import ProjectRepository
from lineage_manager.services.project_service import ProjectService
from lineage_manager.core.uow import GraphUnitOfWork


def setup_test_db():
    """Create in-memory test database."""
    print("Setting up test database...")
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_job_node_repository(session):
    """Test JobNodeRepository functionality."""
    print("\n=== Testing JobNodeRepository ===")
    repo = JobNodeRepository(session)

    # Test 1: Create job node and metadata
    print("Test 1: Creating job node and search data...")
    node = GraphNode(node_type="job", name="test_job_001")
    session.add(node)
    session.commit()

    job_node = repo.create_or_update(
        node_id=node.id,
        project_id="test-project",
        owner_id="test_user",
        properties={"status": "RUNNING", "enabled": True},
    )
    session.commit()

    assert job_node.project_id == "test-project"
    assert job_node.owner_id == "test_user"
    print("✓ Job node data created successfully")

    # Test 2: Update job metadata
    print("Test 2: Updating job search data...")
    updated = repo.create_or_update(
        node_id=node.id, project_id="updated-project", owner_id="updated_user"
    )
    session.commit()

    assert updated.project_id == "updated-project"
    print("✓ Job node data updated successfully")

    # Test 3: Create multiple jobs for search
    print("Test 3: Creating multiple jobs for search...")
    for i in range(5):
        n = GraphNode(node_type="job", name=f"job_{i}")
        session.add(n)
        session.flush()

        repo.create_or_update(
            node_id=n.id,
            project_id="project-a" if i < 3 else "project-b",
            owner_id=f"user_{i}",
            properties={"status": "RUNNING"},
        )
    session.commit()
    print("✓ Created 5 jobs")

    # Test 4: Search by project
    print("Test 4: Searching jobs by project...")
    results, total = repo.find_by_project("project-a", limit=10, offset=0)

    assert total == 3
    assert len(results) == 3
    print(f"✓ Found {total} jobs for project-a")

    # Test 5: Search by owner
    print("Test 5: Searching jobs by owner...")
    results, total = repo.find_by_owner("user_0", limit=10, offset=0)

    assert total == 1
    print(f"✓ Found {total} jobs for user_0")

    # Test 6: Get project stats
    print("Test 6: Getting project statistics...")
    stats = repo.get_project_stats("project-a")

    assert stats["jobs"] == 3
    print(f"✓ Project stats: {stats}")

    # Test 7: Pagination
    print("Test 7: Testing pagination...")
    results_page1, total = repo.find_by_project("project-a", limit=2, offset=0)
    results_page2, _ = repo.find_by_project("project-a", limit=2, offset=2)

    assert len(results_page1) == 2
    assert len(results_page2) == 1
    print(f"✓ Pagination works: page1={len(results_page1)}, page2={len(results_page2)}")


def test_project_service(session):
    """Test ProjectService functionality."""
    print("\n=== Testing ProjectService ===")

    # Create UoW
    uow = GraphUnitOfWork(session)
    service = ProjectService(uow)

    # Test 1: Get project detail (creates placeholder)
    print("Test 1: Getting project detail...")
    detail = service.get_project_detail("new-project")

    assert detail["project"]["project_id"] == "new-project"
    assert "display_name" in detail["project"]
    assert "summary" in detail
    print(f"✓ Project detail: {detail['project']['display_name']}")

    # Test 2: Create jobs for project
    print("Test 2: Creating jobs for project...")
    for i in range(3):
        node = GraphNode(node_type="job", name=f"service_job_{i}")
        session.add(node)
        session.flush()

        uow.job_node.create_or_update(
            node_id=node.id,
            project_id="service-project",
            owner_id=f"user_{i}",
            properties={"display_name": f"Service Job {i}"},
        )
    session.commit()
    print("✓ Created 3 jobs")

    # Test 3: List project jobs
    print("Test 3: Listing project jobs...")
    jobs_result = service.list_project_jobs("service-project", limit=10, offset=0)

    assert jobs_result["total"] == 3
    assert len(jobs_result["jobs"]) == 3
    assert jobs_result["jobs"][0]["job_name"] == "Service Job 0"
    print(f"✓ Listed {jobs_result['total']} jobs")

    # Test 4: List all projects
    print("Test 4: Listing all projects...")
    projects = service.list_all_projects(limit=100)

    assert len(projects) > 0
    print(f"✓ Found {len(projects)} projects")


def test_project_repository(session):
    """Test ProjectRepository functionality."""
    print("\n=== Testing ProjectRepository ===")
    repo = ProjectRepository(session)

    # Test 1: Create project
    print("Test 1: Creating project...")
    project = repo.create_or_update(
        project_id="repo-test-project",
        display_name="Repo Test Project",
        description="Test project for repository",
        business_unit="Engineering",
    )
    session.commit()

    assert project.project_id == "repo-test-project"
    assert project.display_name == "Repo Test Project"
    print("✓ Project created successfully")

    # Test 2: Get project
    print("Test 2: Getting project...")
    retrieved = repo.get("repo-test-project")

    assert retrieved is not None
    assert retrieved.business_unit == "Engineering"
    print("✓ Project retrieved successfully")

    # Test 3: Update project
    print("Test 3: Updating project...")
    updated = repo.create_or_update(
        project_id="repo-test-project",
        display_name="Updated Project Name",
        description="Updated description",
    )
    session.commit()

    assert updated.display_name == "Updated Project Name"
    print("✓ Project updated successfully")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Search Table Functionality Tests")
    print("=" * 60)

    try:
        session = setup_test_db()

        # Run tests
        test_job_node_repository(session)
        test_project_repository(session)
        test_project_service(session)

        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)

        session.close()
        return 0

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

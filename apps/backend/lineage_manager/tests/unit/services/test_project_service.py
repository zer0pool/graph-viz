"""Unit tests for ProjectService."""

import pytest
from unittest.mock import Mock, MagicMock

from services.project_service import ProjectService
from models import GraphNode, JobNode, Project


class TestProjectService:
    """Test ProjectService functionality."""
    
    @pytest.fixture
    def mock_uow(self):
        """Create mock UnitOfWork."""
        uow = Mock()
        uow.job_node = Mock()
        uow.project = Mock()
        uow.users = Mock()
        return uow
    
    @pytest.fixture
    def service(self, mock_uow):
        """Create ProjectService with mock UoW."""
        return ProjectService(mock_uow)
    
    def test_get_project_detail_existing(self, service, mock_uow):
        """Test getting detail for existing project."""
        # Mock project
        mock_project = Mock(spec=Project)
        mock_project.project_id = "test-project"
        mock_project.display_name = "Test Project"
        mock_project.description = "Test description"
        mock_project.business_unit = "Engineering"
        mock_project.status = "ACTIVE"
        
        mock_uow.project.get.return_value = mock_project
        mock_uow.job_node.get_project_stats.return_value = {"jobs": 42}
        
        # Get detail
        result = service.get_project_detail("test-project")
        
        assert result["project"]["project_id"] == "test-project"
        assert result["project"]["display_name"] == "Test Project"
        assert result["summary"]["jobs"] == 42
        
        mock_uow.project.get.assert_called_once_with("test-project")
        mock_uow.job_node.get_project_stats.assert_called_once_with("test-project")

    def test_get_project_summary(self, service, mock_uow):
        """Test getting project summary."""
        mock_project = Mock(spec=Project)
        mock_project.project_id = "test-project"
        mock_project.display_name = "Test Project"
        
        mock_uow.project.get.return_value = mock_project
        mock_uow.job_node.get_project_stats.return_value = {"jobs": 42}
        
        result = service.get_project_summary("test-project")
        
        assert result["project_id"] == "test-project"
        assert result["display_name"] == "Test Project"
        assert result["stats"]["jobs"] == 42
    
    def test_get_project_detail_creates_placeholder(self, service, mock_uow):
        """Test creating placeholder for non-existent project."""
        # Mock no existing project
        mock_uow.project.get.return_value = None
        
        # Mock created project
        mock_created = Mock(spec=Project)
        mock_created.project_id = "new-project"
        mock_created.display_name = "New Project"
        mock_created.description = "Auto-generated project"
        mock_created.business_unit = None
        mock_created.status = "ACTIVE"
        
        mock_uow.project.create_or_update.return_value = mock_created
        mock_uow.job_node.get_project_stats.return_value = {"jobs": 0}
        
        # Get detail
        result = service.get_project_detail("new-project")
        
        assert result["project"]["project_id"] == "new-project"
        assert result["project"]["display_name"] == "New Project"
        
        mock_uow.project.create_or_update.assert_called_once()
    
    def test_list_project_jobs(self, service, mock_uow):
        """Test listing jobs in a project."""
        # Mock nodes and metadata
        mock_results = []
        for i in range(3):
            node = Mock(spec=GraphNode)
            node.id = i + 1
            node.name = f"job_{i}"
            
            meta = Mock(spec=JobNode)
            meta.project_id = "test-project"
            meta.owner_id = f"user_{i}"
            meta.properties = {
                "display_name": f"Job {i}",
                "status": "RUNNING",
                "enabled": True
            }
            
            mock_results.append((node, meta))
        
        mock_uow.job_node.find_by_project.return_value = (mock_results, 3)
        
        # List jobs
        result = service.list_project_jobs("test-project", limit=20, offset=0)
        
        assert result["total"] == 3
        assert len(result["jobs"]) == 3
        assert result["jobs"][0]["job_id"] == "job_0"
        assert result["jobs"][0]["running_status"] == "RUNNING"
        assert result["jobs"][0]["owner"] == "user_0"
        
        mock_uow.job_node.find_by_project.assert_called_once_with(
            "test-project", 20, 0
        )

    def test_list_project_users(self, service, mock_uow):
        """Test listing users in a project."""
        mock_user = Mock()
        mock_user.user_id = "user_1"
        mock_user.name = "User One"
        mock_user.department = "Data"
        
        mock_uow.users.find_by_project.return_value = [mock_user]
        
        result = service.list_project_users("test-project")
        
        assert result["total"] == 1
        assert result["users"][0]["user_id"] == "user_1"
        assert result["users"][0]["department"] == "Data"
    
    def test_list_all_projects(self, service, mock_uow):
        """Test listing all projects."""
        mock_projects = [
            {"project_id": "project-a", "job_count": 10},
            {"project_id": "project-b", "job_count": 5},
        ]
        
        mock_uow.job_node.list_projects_with_counts.return_value = mock_projects
        
        # List projects
        result = service.list_all_projects(limit=100)
        
        assert len(result) == 2
        assert result[0]["project_id"] == "project-a"
        assert result[0]["job_count"] == 10
        
        mock_uow.job_node.list_projects_with_counts.assert_called_once_with(100)
    
    def test_format_job(self, service):
        """Test job formatting."""
        node = Mock(spec=GraphNode)
        node.id = 123
        node.name = "test_job"
        
        meta = Mock(spec=JobNode)
        meta.project_id = "my-project"
        meta.owner_id = "my-user"
        meta.properties = {
            "display_name": "My Test Job",
            "status": "COMPLETED",
            "enabled": False
        }
        
        formatted = service._format_job(node, meta)
        
        assert formatted["node_id"] == 123
        assert formatted["job_id"] == "test_job"
        assert formatted["job_name"] == "My Test Job"
        assert formatted["running_status"] == "COMPLETED"
        assert formatted["owner"] == "my-user"
        assert formatted["enabled"] is False
    
    def test_generate_display_name(self, service):
        """Test display name generation."""
        assert service._generate_display_name("my-project") == "My Project"
        assert service._generate_display_name("data_pipeline") == "Data Pipeline"
        assert service._generate_display_name("test-project-123") == "Test Project 123"

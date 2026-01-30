import pytest
from unittest.mock import MagicMock
from lineage_manager.services.user_service import UserService
from lineage_manager.core.uow import UserUnitOfWork


class TestUserServiceUoW:

    @pytest.fixture
    def mock_uow(self):
        uow = MagicMock(spec=UserUnitOfWork)
        # Configure instance attributes
        uow.users = MagicMock()

        # Mock context manager behavior
        uow.__enter__.return_value = uow
        uow.__exit__.return_value = None
        return uow

    @pytest.fixture
    def mock_graph_uow(self):
        uow = MagicMock()
        uow.job_node = MagicMock()
        return uow

    @pytest.fixture
    def service(self, mock_uow, mock_graph_uow):
        return UserService(uow=mock_uow, graph_uow=mock_graph_uow)

    def test_record_login_uses_uow_context(self, service, mock_uow):
        claims = {"sub": "123", "email": "test@example.com"}
        mock_user = MagicMock()
        mock_uow.users.upsert_from_claims.return_value = mock_user

        service.record_login(claims)

        # Verification
        mock_uow.__enter__.assert_called_once()
        mock_uow.users.upsert_from_claims.assert_called_with(claims)
        mock_uow.__exit__.assert_called_once()

    def test_get_profile_accesses_uow_repositories(self, service, mock_uow):
        sub = "123"
        mock_user = MagicMock()
        mock_user.sub = sub
        mock_user.email = "test@example.com"
        mock_user.last_login_at = None
        # Provide attributes accessed in get_profile
        mock_user.roles = []
        mock_user.dept = "Eng"

        mock_uow.users.get_by_sub.return_value = mock_user

        result = service.get_profile(sub)

        # Verification
        mock_uow.users.get_by_sub.assert_called_with(sub)
        assert result["user"]["sub"] == sub

    def test_get_user_detail(self, service, mock_uow, mock_graph_uow):
        user_id = "user_01"
        mock_user = MagicMock()
        mock_user.user_id = user_id
        mock_user.name = "Test User"
        mock_user.department = "Data"
        mock_user.status = "ACTIVE"

        mock_uow.users.get_catalog_user.return_value = mock_user
        mock_graph_uow.job_node.get_owner_stats.return_value = {"owned_jobs": 5}
        mock_uow.users.list_user_projects.return_value = [MagicMock(), MagicMock()]

        result = service.get_user_detail(user_id)

        assert result["user"]["user_id"] == user_id
        assert result["summary"]["owned_jobs"] == 5
        assert result["summary"]["project_count"] == 2

    def test_get_user_jobs(self, service, mock_graph_uow):
        user_id = "user_01"
        node = MagicMock()
        node.name = "job_1"
        node.id = 101

        meta = MagicMock()
        meta.owner_id = user_id
        meta.properties = {"status": "SUCCESS", "display_name": "Job 1"}

        mock_graph_uow.job_node.find_by_owner.return_value = ([(node, meta)], 1)

        result = service.get_user_jobs(user_id)

        assert result["total"] == 1
        assert result["jobs"][0]["job_id"] == "job_1"
        assert result["jobs"][0]["running_status"] == "SUCCESS"

    def test_get_user_projects(self, service, mock_uow):
        user_id = "user_01"
        mock_project = MagicMock()
        mock_project.project_id = "proj_1"
        mock_project.display_name = "Project 1"
        mock_project.status = "ACTIVE"

        mock_uow.users.list_user_projects.return_value = [mock_project]

        result = service.get_user_projects(user_id)

        assert result["total"] == 1
        assert result["projects"][0]["project_id"] == "proj_1"

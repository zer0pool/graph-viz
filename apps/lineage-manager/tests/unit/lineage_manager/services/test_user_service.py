
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
    def service(self, mock_uow):
        return UserService(uow=mock_uow)

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

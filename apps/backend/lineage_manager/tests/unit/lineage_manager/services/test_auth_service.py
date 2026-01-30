import pytest
from unittest.mock import MagicMock, AsyncMock
from lineage_manager.services.auth_service import AuthService
from lineage_manager.services.user_service import UserService
from lineage_manager.core.auth import OIDCProviderClient, AuthenticationError
from starlette.requests import Request


class TestAuthService:

    @pytest.fixture
    def mock_user_service(self):
        return MagicMock(spec=UserService)

    @pytest.fixture
    def mock_oidc_client(self):
        client = MagicMock(spec=OIDCProviderClient)
        client.auth_config.return_value = {
            "client_id": "test_client",
            "authorization_endpoint": "https://auth.example.com/login",
            "scope": "openid email",
            "redirect_uri": "https://app.example.com/callback",
        }
        return client

    @pytest.fixture
    def service(self, mock_user_service, mock_oidc_client):
        mock_redis = MagicMock()
        return AuthService(user_service=mock_user_service, oidc_client=mock_oidc_client, redis_client=mock_redis)

    @pytest.fixture
    def mock_request(self):
        request = MagicMock(spec=Request)
        request.session = {}
        return request

    def test_get_login_url(self, service, mock_request):
        url = service.get_login_url(mock_request)
        assert "https://auth.example.com/login" in url
        assert "client_id=test_client" in url
        assert "state=" in url
        # Verify Redis was called to store state
        service.redis_client.setex.assert_called_once()
        # Ensure session was NOT used (as Redis mock is present)
        assert "oidc_state" not in mock_request.session

    @pytest.mark.asyncio
    async def test_handle_callback_success(
        self, service, mock_request, mock_user_service, mock_oidc_client
    ):
        # Setup
        state = "test_state"
        code = "test_code"

        # Mock Redis returning a valid nonce for the state
        service.redis_client.get.return_value = b"test_nonce"
        
        mock_oidc_client.exchange_code.return_value = {
            "id_token": "id_token_val",
            "access_token": "access_token_val",
        }
        mock_oidc_client.verify_id_token.return_value = {
            "sub": "user_123",
            "email": "test@example.com",
        }
        mock_user_service.record_login.return_value = {
            "sub": "user_123",
            "name": "Test User",
        }

        # Execute
        result = await service.handle_callback(mock_request, code, state)

        # Verify
        assert result["sub"] == "user_123"
        assert mock_request.session["user"] == result
        # access_token is no longer stored in session
        assert "access_token" not in mock_request.session
        mock_user_service.record_login.assert_called_once()
        service.redis_client.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_callback_state_mismatch(self, service, mock_request):
        # Redis return None -> Fallback to Session
        service.redis_client.get.return_value = None
        
        mock_request.session["oidc_state"] = "correct_state"
        with pytest.raises(ValueError, match="Invalid OIDC state"):
            await service.handle_callback(mock_request, "code", "wrong_state")

    def test_get_current_user_authenticated(self, service, mock_request):
        user = {"sub": "user_123", "name": "Test User"}
        mock_request.session["user"] = user
        assert service.get_current_user(mock_request) == user

    def test_get_current_user_anonymous(self, service, mock_request):
        # Mock the settings object to avoid read-only property error
        mock_settings = MagicMock()
        mock_settings.require_signin = False
        service.settings = mock_settings

        result = service.get_current_user(mock_request)
        assert result["is_anonymous"] is True

    def test_logout(self, service, mock_request):
        mock_request.session["user"] = {"sub": "123"}
        service.logout(mock_request)
        assert mock_request.session == {}

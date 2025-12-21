from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from lineage_manager.api.v1.schemas import UserResponse
from lineage_manager.core.container import GraphContainer
from lineage_manager.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user_service():
    return MagicMock()


@pytest.fixture
def override_dependencies(mock_user_service):
    with app.container.user.user_service.override(mock_user_service):
        yield


def test_list_users(client, mock_user_service, override_dependencies):
    # Mock authentication
    app.dependency_overrides = {} # Reset
    # We might need to override require_authenticated_user if it's a global dep or router dep
    # For now, let's assume we can mock the service injection.
    # But require_authenticated_user is on the router.
    
    # Mock return value
    mock_user_service.list_users.return_value = [
        UserResponse(id=1, sub="sub1", name="User 1", email="u1@example.com", roles=["Viewer"], created_at="2024-01-01T00:00:00"),
        UserResponse(id=2, sub="sub2", name="User 2", email="u2@example.com", roles=["Admin"], created_at="2024-01-01T00:00:00")
    ]

    # Override auth dependency to bypass check
    from lineage_manager.core.auth import require_authenticated_user
    app.dependency_overrides[require_authenticated_user] = lambda: {"sub": "admin", "roles": ["Admin"]}

    response = client.get("/api/v1/users")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["sub"] == "sub1"
    
    # Clean up
    app.dependency_overrides = {}


def test_create_user(client, mock_user_service, override_dependencies):
    mock_user_service.create_user.return_value = UserResponse(
        id=1, sub="new_sub", name="New User", email="new@example.com", roles=["Viewer"], created_at="2024-01-01T00:00:00"
    )

    from lineage_manager.core.auth import require_authenticated_user
    app.dependency_overrides[require_authenticated_user] = lambda: {"sub": "admin"}

    payload = {
        "sub": "new_sub",
        "name": "New User",
        "email": "new@example.com",
        "roles": ["Viewer"]
    }
    response = client.post("/api/v1/users", json=payload)
    
    assert response.status_code == 201
    assert response.json()["sub"] == "new_sub"
    mock_user_service.create_user.assert_called_once()
    
    app.dependency_overrides = {}


def test_add_role(client, mock_user_service, override_dependencies):
    mock_user_service.add_role.return_value = {
        "id": 1, "sub": "sub1", "name": "User 1", "roles": ["Viewer", "Admin"], "created_at": "2024-01-01T00:00:00"
    }

    from lineage_manager.core.auth import require_authenticated_user
    app.dependency_overrides[require_authenticated_user] = lambda: {"sub": "admin"}

    response = client.post("/api/v1/users/1/roles/Admin")
    
    assert response.status_code == 200
    assert "Admin" in response.json()["roles"]
    mock_user_service.add_role.assert_called_with(1, "Admin")
    
    app.dependency_overrides = {}

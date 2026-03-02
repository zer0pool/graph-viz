from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    # Mock Redis to ensure test passes regardless of external service
    with patch(
        "app.api.v2.endpoints.health.check_redis", new_callable=AsyncMock
    ) as mock_redis:
        mock_redis.return_value = True

        response = await client.get("/api/v1/health")

        # Expect 200 OK because DB is mocked (SQLite) and Redis is mocked (True)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert data["redis"] == "connected"

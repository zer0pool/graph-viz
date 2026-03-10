import pytest
from unittest.mock import AsyncMock, patch
from app.domain.entity.analytics import TrackEvent
from app.application.usecase.analytics.track_event import TrackEventUseCase

@pytest.mark.asyncio
async def test_track_event_usecase_success():
    mock_redis = AsyncMock()
    mock_redis.lpush.return_value = 1
    
    uc = TrackEventUseCase(redis=mock_redis)
    event = TrackEvent(path="/home", properties={"source": "test"})
    
    result = await uc.execute(event)
    assert result is True
    mock_redis.lpush.assert_called_once()

@pytest.mark.asyncio
async def test_track_event_usecase_failure():
    mock_redis = AsyncMock()
    mock_redis.lpush.side_effect = Exception("Redis error")
    
    uc = TrackEventUseCase(redis=mock_redis)
    event = TrackEvent(path="/home")
    
    result = await uc.execute(event)
    assert result is False

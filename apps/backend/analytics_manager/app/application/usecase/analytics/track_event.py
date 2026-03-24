import logging

from app.domain.entity.analytics import TrackEvent

logger = logging.getLogger(__name__)


class TrackEventUseCase:
    """
    Receives page view events from the frontend.
    Visit data is persisted directly by the frontend via lineage-manager.
    This use case is kept for backward compatibility but performs no action.
    """

    async def execute(self, event: TrackEvent) -> bool:
        return True

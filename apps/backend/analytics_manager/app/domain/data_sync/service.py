import json
import logging
from typing import Any, Dict, List

from redis import Redis

from app.infrastructure.gcp.bigquery import BigQueryClient

logger = logging.getLogger(__name__)


class DataSyncService:
    """
    Service responsible for synchronizing data between Redis/Queues and BigQuery.
    """

    def __init__(self, bq_client: BigQueryClient, redis_client: Redis):
        self.bq_client = bq_client
        self.redis = redis_client

    async def sync_redis_queue_to_bigquery(
        self, queue_key: str, table_id: str, batch_size: int = 100
    ) -> int:
        """
        Pops items from a Redis list and performs a batch insert into BigQuery.
        """
        events = []
        try:
            for _ in range(batch_size):
                data = await self.redis.rpop(queue_key)  # type: ignore
                if not data:
                    break
                try:
                    events.append(json.loads(data))
                except Exception as e:
                    logger.error(f"Failed to parse event data: {e}")

            if not events:
                return 0

            logger.info(f"Syncing {len(events)} records to BigQuery: {table_id}")
            success = self.bq_client.insert_rows(table_id, events)

            if success:
                logger.info(f"Successfully synced {len(events)} records.")
                return len(events)
            else:
                logger.error(
                    f"BigQuery insert failed. Re-queueing {len(events)} records."
                )
                for event in events:
                    await self.redis.lpush(queue_key, json.dumps(event))  # type: ignore
                return 0

        except Exception as e:
            logger.exception(f"Error during sync: {e}")
            return 0

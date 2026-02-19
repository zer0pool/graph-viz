import logging
import json
from typing import List, Dict, Any
from redis import Redis
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class DataSyncService:
    """
    Service responsible for synchronizing data between different storage layers.
    Commonly used for moving real-time data from Redis/Queues to persistent storage like BigQuery.
    """
    def __init__(self, bq_client: BigQueryClient, redis_client: Redis):
        self.bq_client = bq_client
        self.redis = redis_client

    def sync_redis_queue_to_bigquery(self, queue_key: str, table_id: str, batch_size: int = 100) -> int:
        """
        Pops items from a Redis list and performs a batch insert into BigQuery.
        Returns the number of successfully synced records.
        """
        events = []
        try:
            # Batch extraction from Redis
            for _ in range(batch_size):
                data = self.redis.rpop(queue_key)
                if not data:
                    break
                try:
                    events.append(json.loads(data))
                except Exception as e:
                    logger.error(f"Failed to parse event data from Redis for key {queue_key}: {e}")

            if not events:
                return 0

            logger.info(f"Syncing {len(events)} records to BigQuery table: {table_id}")
            
            # Perform streaming insert
            success = self.bq_client.insert_rows(table_id, events)
            
            if success:
                logger.info(f"Successfully synced {len(events)} records.")
                return len(events)
            else:
                logger.error(f"BigQuery batch insert failed for {table_id}. {len(events)} records might be lost.")
                # Basic re-queueing strategy (pushed back to tail)
                for event in events:
                    self.redis.lpush(queue_key, json.dumps(event))
                logger.info(f"Re-queued {len(events)} records for retry.")
                return 0

        except Exception as e:
            logger.exception(f"Unexpected error during data synchronization: {e}")
            return 0

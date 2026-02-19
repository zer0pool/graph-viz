import time
import json
import logging
from celery import Celery
from celery.schedules import crontab
from redis import Redis

from app.core.config import settings
from app.infrastructure.gcp.bigquery import BigQueryClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Core Celery app configuration
# We use db 0 for broker by default in settings, and db 2 for backend (app cache)
celery_app = Celery(
    "metrics_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Optional: Periodic tasks configuration
celery_app.conf.beat_schedule = {
    "sync-visits-to-bq-periodic": {
        "task": "app.worker.sync_events_to_bq",
        "schedule": 60.0,  # Run every 60 seconds for demo/fast feedback
    },
}

@celery_app.task(name="app.worker.sync_events_to_bq")
def sync_events_to_bq():
    """
    Periodic task to sync visit logs from Redis queue to BigQuery.
    Delegates work to DataSyncService.
    """
    logger.info("Triggering periodic BigQuery sync...")
    
    try:
        from app.services.data_sync_service import DataSyncService
        
        # Instantiate dependencies
        # In a more advanced setup, we could use a DI container here as well
        bq_client = BigQueryClient()
        redis_client = Redis(
            host=settings.REDIS_HOST, 
            port=settings.REDIS_PORT, 
            db=settings.REDIS_DB,
            decode_responses=True
        )
        
        sync_service = DataSyncService(bq_client, redis_client)
        
        synced_count = sync_service.sync_redis_queue_to_bigquery(
            queue_key="analytics:raw_events",
            table_id=settings.BIGQUERY_VISIT_LOG_TABLE,
            batch_size=100
        )
        
        if synced_count > 0:
            logger.info(f"Sync task completed. {synced_count} events processed.")
        else:
            logger.info("Sync task completed. No events processed.")
            
        return synced_count
            
    except Exception as e:
        logger.exception(f"Critical failure in sync_events_to_bq task: {e}")
        return 0

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Metrics Manager - Manual Task Runner")
    parser.add_argument(
        "task", 
        choices=["sync"], 
        help="The name of the task to execute manually."
    )
    
    args = parser.parse_args()

    if args.task == "sync":
        logger.info("Executing manual sync: sync_events_to_bq")
        result = sync_events_to_bq()
        logger.info(f"Manual sync finished. Result: {result}")
    else:
        logger.error(f"Unknown task: {args.task}")
        sys.exit(1)

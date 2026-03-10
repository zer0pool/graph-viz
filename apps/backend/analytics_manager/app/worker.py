import logging

from celery import Celery  # type: ignore
from redis import Redis

from app.application.usecase.data_sync.sync_data import SyncDataUseCase
from app.core.config import settings
from app.infrastructure.gcp.bigquery import BigQueryClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

celery_app = Celery(
    "analytics_worker", broker=settings.CELERY_BROKER_URL, backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "sync-visits-to-bq-periodic": {
        "task": "app.worker.sync_events_to_bq",
        "schedule": 60.0,
    },
}


@celery_app.task(name="app.worker.sync_events_to_bq")
def sync_events_to_bq():
    logger.info("Triggering periodic BigQuery sync...")

    try:
        # Create independent clients for the background worker
        bq_client = BigQueryClient()
        redis_client = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
        )

        use_case = SyncDataUseCase(bq_client, redis_client)

        import asyncio

        # Run async execute in synchronous celery task
        synced_count = asyncio.run(
            use_case.execute(
                queue_key="analytics:raw_events",
                table_id=settings.BIGQUERY_VISIT_LOG_TABLE,
                batch_size=100,
            )
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

    parser = argparse.ArgumentParser(
        description="Analytics Manager - Manual Task Runner"
    )
    parser.add_argument(
        "task", choices=["sync"], help="The name of the task to execute manually."
    )
    args = parser.parse_args()

    if args.task == "sync":
        logger.info("Executing manual sync: sync_events_to_bq")
        result = sync_events_to_bq()
        logger.info(f"Manual sync finished. Result: {result}")
    else:
        logger.error(f"Unknown task: {args.task}")
        sys.exit(1)

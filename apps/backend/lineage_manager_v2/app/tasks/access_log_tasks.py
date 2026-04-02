import asyncio
import json
import logging
import time

from app.core.celery_app import celery_app
from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.redis import redis_client
from app.infrastructure.repositories.access_log_repository import AccessLogRepository

logger = logging.getLogger("lineage_manager.access_log")

# Adaptive scheduling intervals
SHORT_INTERVAL = 60    # seconds — used when entries were flushed (stay active)
LONG_INTERVAL = 600    # seconds — used when buffer was empty (back off)


@celery_app.task(name="app.tasks.access_log_tasks.flush_access_logs", bind=True)
def flush_access_logs(self) -> None:
    """Celery beat task: drain Redis access log buffers into MySQL.

    Reschedules itself adaptively:
    - Entries flushed  → next run in SHORT_INTERVAL (30s)
    - Buffer was empty → next run in LONG_INTERVAL  (300s)
    """

    async def _run() -> int:
        """Returns the number of records inserted (0 = nothing to do)."""
        task_id = self.request.id
        started_at = time.monotonic()
        logger.info(f"[AccessLog] Task started (task_id={task_id})")

        # --- Step 1: Drain Redis buffers ---
        raw_entries: list[str] = []
        per_service_counts: dict[str, int] = {}

        for service in ["lineage", "analytics"]:
            key = f"api:access:log:{service}"
            pipe = redis_client.pipeline()
            pipe.lrange(key, 0, -1)
            pipe.delete(key)
            results = await pipe.execute()
            drained = results[0]
            per_service_counts[service] = len(drained)
            raw_entries.extend(drained)
            logger.debug(f"[AccessLog] Redis drain — key={key}, count={len(drained)}")

        total_drained = len(raw_entries)
        logger.info(
            f"[AccessLog] Redis drain complete — "
            f"lineage={per_service_counts['lineage']}, "
            f"analytics={per_service_counts['analytics']}, "
            f"total={total_drained}"
        )

        if total_drained == 0:
            logger.info(f"[AccessLog] Buffer empty — backing off. (task_id={task_id})")
            return 0

        # --- Step 2: Parse JSON entries ---
        records: list[dict] = []
        parse_errors = 0
        for raw in raw_entries:
            try:
                records.append(json.loads(raw))
            except Exception as e:
                parse_errors += 1
                logger.warning(f"[AccessLog] Skipping malformed entry: {raw!r} — {e}")

        if parse_errors:
            logger.warning(
                f"[AccessLog] Parse errors: {parse_errors}/{total_drained} entries skipped"
            )

        if not records:
            logger.error(
                f"[AccessLog] All {total_drained} entries were malformed. "
                f"Nothing inserted. (task_id={task_id})"
            )
            return 0

        # --- Step 3: Bulk insert into MySQL ---
        logger.info(f"[AccessLog] Inserting {len(records)} records into DB...")
        async with AsyncSessionLocal() as session:
            try:
                repo = AccessLogRepository(session)
                count = await repo.bulk_insert(records)
                await session.commit()
                elapsed_ms = int((time.monotonic() - started_at) * 1000)
                logger.info(
                    f"[AccessLog] Flush complete — "
                    f"inserted={count}, skipped={parse_errors}, "
                    f"elapsed={elapsed_ms}ms (task_id={task_id})"
                )
                return count
            except Exception as e:
                await session.rollback()
                logger.error(
                    f"[AccessLog] DB insert failed — "
                    f"records={len(records)}, error={e} (task_id={task_id})",
                    exc_info=True,
                )
                raise

    inserted = asyncio.run(_run())

    # --- Step 4: Adaptive rescheduling ---
    if inserted > 0:
        next_interval = SHORT_INTERVAL
        logger.info(
            f"[AccessLog] Work done ({inserted} records). "
            f"Rescheduling in {next_interval}s (active mode)."
        )
    else:
        next_interval = LONG_INTERVAL
        logger.info(
            f"[AccessLog] Nothing to flush. "
            f"Rescheduling in {next_interval}s (idle mode)."
        )

    flush_access_logs.apply_async(countdown=next_interval)

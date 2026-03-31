from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "lineage_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.graph_tasks",
        "app.tasks.audit_tasks",
        "app.tasks.access_log_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    task_default_queue="lineage_v2",
    beat_schedule={
        # Kickstart only — the task reschedules itself adaptively after the first run.
        # This entry also acts as a dead man's switch if the task chain ever breaks.
        "flush-access-logs-kickstart": {
            "task": "app.tasks.access_log_tasks.flush_access_logs",
            "schedule": 600.0,  # 10 minutes — matches LONG_INTERVAL (idle fallback)
        },
    },
)

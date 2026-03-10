import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.core.celery_app import celery_app
from app.core.container import Container
from app.infrastructure.database import get_db

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.audit_tasks.process_audit", bind=True)
def process_audit(self, action: str, **kwargs: Any) -> Optional[Any]:
    """
    Asynchronous task for processing audit logs.
    Handles INSERT/UPDATE based on the provided action.
    """
    async def _run():
        container = Container()
        uow = container.uow()
        
        async with uow:
            try:
                logger.debug(f"Processing audit task: {action} with kwargs={kwargs}")
                
                if action == "CREATE_MASTER":
                    model = await uow.audits.create_master(
                        action=kwargs["action_type"],
                        target_type=kwargs.get("target_type", "SYSTEM"),
                        user_email=kwargs["user_email"],
                        total_count=kwargs.get("total_count", 0),
                        payload=kwargs.get("payload"),
                        status=kwargs.get("status", "PENDING"),
                        target_id=kwargs.get("target_id"),
                        duration=kwargs.get("duration")
                    )
                    await uow.commit()
                    return model.id
                    
                elif action == "BULK_CREATE_DETAILS":
                    parent_id = int(kwargs["parent_id"])
                    count = await uow.audits.bulk_create_details(
                        parent_id=parent_id,
                        action=kwargs["action_type"],
                        target_type=kwargs.get("target_type", "SYSTEM"),
                        user_email=kwargs["user_email"],
                        targets=kwargs["targets"],
                        status=kwargs.get("status", "INITIATED"),
                        message=kwargs.get("message")
                    )
                    await uow.commit()
                    logger.info(f"Bulk Created {count} details for parent {parent_id}")
                    return count
                    
                elif action == "UPDATE_DETAIL":
                    parent_id = int(kwargs["parent_id"])
                    target_id = kwargs["target_id"]
                    success = await uow.audits.update_detail_status(
                        parent_id=parent_id,
                        target_id=target_id,
                        status=kwargs["status"],
                        message=kwargs.get("message")
                    )
                    await uow.commit()
                    logger.info(f"Update Detail {target_id} (parent {parent_id}) status to {kwargs['status']}: {success}")
                    return success
                    
                elif action == "UPDATE_MASTER":
                    audit_id = int(kwargs["audit_id"])
                    success = await uow.audits.update_master_status(
                        audit_id=audit_id,
                        status=kwargs["status"],
                        total_count=kwargs.get("total_count"),
                        success_count=kwargs.get("success_count"),
                        fail_count=kwargs.get("fail_count"),
                        duration=kwargs.get("duration")
                    )
                    await uow.commit()
                    logger.info(f"Update Master {audit_id} status to {kwargs['status']}: {success}")
                    return success
                    
                else:
                    logger.error(f"Unknown audit action: {action}")
                    return None
                    
            except Exception as e:
                logger.error(f"Failed to process audit action {action}: {e}")
                logger.exception("Audit Processing Error")
                # Rollback is handled by the async with uow context manager
                raise e

    try:
        return asyncio.run(_run())
    except Exception as e:
        logger.error(f"Process audit task failed: {str(e)}")
        # Safe retry for audit logging
        self.retry(exc=e, countdown=5, max_retries=3)
        return None

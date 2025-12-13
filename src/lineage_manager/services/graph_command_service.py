import logging
from typing import Any, Dict, List, Optional

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.api.v1.schemas import JobRegister, JobUpdateRequest
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.models.scheduling_lineage import SchedulingLineage

logger = logging.getLogger(__name__)


class GraphCommandService:
    def __init__(self, uow: GraphUnitOfWork, job_manager: JobManagerAdapter):
        self.uow = uow
        self.job_manager = job_manager

    def register_job(self, job_data: JobRegister) -> str:
        """
        Register a new job in the system using Unit of Work pattern.
        """
        logger.info(f"Starting job registration for job_id: {job_data.job_id}")
        uow = self.uow
        try:
            job = self._create_job_node(job_data)
            in_ids = self._process_reference_tables(job, job_data)
            self._process_destination_table(job, job_data)
            self._create_upstream_relationships(job, in_ids)
            
            uow.commit()
            logger.info(f"Job registration completed successfully for job_id: {job.job_id}")
            return job.id
        except Exception as e:
            logger.error(
                f"Error during job registration for job_id {job_data.job_id}: {e}"
            )
            uow.rollback()
            raise

    def register_lineage_job(self, lineage: SchedulingLineage) -> str:
        """
        Register a job described via SchedulingLineage payload.
        """
        job_payload = JobDataTransformer.lineage_to_job_register(lineage)
        return self.register_job(job_payload)

    def toggle_job_enabled(self, job_id: str):
        """Flip enabled flag stored in job.job_metadata and expose attribute."""
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        meta = dict(job.job_metadata or {})
        current = bool(meta.get("enabled", True))
        meta["enabled"] = not current
        # keep status default if missing
        meta.setdefault("status", "pending")
        job.job_metadata = meta
        
        try:
            self.uow.commit()
            # Attach for response convenience
            setattr(job, "enabled", meta["enabled"])
            setattr(job, "status", meta.get("status"))
            return job
        except Exception:
            self.uow.rollback()
            raise
            raise
            
    def update_job(self, job_id: str, payload: JobUpdateRequest) -> Optional[Dict[str, Any]]:
        """Update job mutable fields."""
        uow = self.uow
        job = uow.jobs.get(job_id)
        if not job:
            return None
        
        updates: dict = {}
        meta = dict(getattr(job, "job_metadata", {}) or {})

        if payload.status is not None:
            valid_statuses = {"pending", "success", "failure", "disabled"}
            if payload.status not in valid_statuses:
                raise ValueError(f"Invalid status: {payload.status}")
            meta["status"] = payload.status
            updates["status"] = payload.status
        
        if payload.enabled is not None:
            meta["enabled"] = bool(payload.enabled)
            updates["enabled"] = bool(payload.enabled)

        if payload.trigger_tables is not None:
            job.trigger_tables = payload.trigger_tables
            updates["trigger_tables"] = payload.trigger_tables

        if "status" in updates or "enabled" in updates:
            job.job_metadata = meta
        
        if updates:
             try:
                 uow.commit()
             except Exception:
                 uow.rollback()
                 raise

        return {
            "job_id": job_id,
            "updated": updates,
            "message": f"Job '{job_id}' updated successfully.",
        }
    def reset_graph(self):
        """Delete all graph-related table data"""
        uow = self.uow
        try:
            logger.info("Starting graph reset - clearing all graph data")
            # Order matters: closure → edge → job_table_link → job → table
            uow.closures.clear_all()
            uow.edges.clear_all()
            uow.job_table_links.clear_all()
            uow.jobs.clear_all()
            uow.tables.clear_all()
            uow.commit()
            logger.info("✅ Graph reset complete: all graph data cleared.")
            return {
                "status": "success",
                "message": "Graph reset complete: all graph data cleared.",
            }
        except Exception as e:
            logger.error(f"❌ Graph reset failed: {e}")
            uow.rollback()
            raise

    def set_table_trigger(self, table_name: str, job_id: str, trigger: bool):
        """Set trigger ON/OFF for a specific job consuming a given table."""
        uow = self.uow
        logger.info(f"set_table_trigger {job_id}/{table_name}: trigger: {trigger} ")
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}
            job = uow.jobs.get(job_id)
            if not job:
                return {"status": "error", "message": f"Job '{job_id}' not found"}

            trig_list = list(job.trigger_tables or [])
            prev = table_name in trig_list
            if trigger and not prev:
                trig_list.append(table_name)
            elif not trigger and prev:
                trig_list = [t for t in trig_list if t != table_name]
            job.trigger_tables = trig_list

            # Update edge flag for readability/status
            try:
                uow.edges.set_input_trigger(job.id, table.id, trigger)
            except Exception:
                pass

            uow.commit()
            self._invalidate_trigger_cache(table_name)

            return {
                "status": "success",
                "job_id": job_id,
                "table_name": table_name,
                "previous_state": bool(prev),
                "new_state": bool(trigger),
            }
        except Exception as e:
            logger.error(f"Failed to set trigger for {job_id}/{table_name}: {e}")
            uow.rollback()
            return {"status": "error", "message": str(e)}

    def bulk_set_table_triggers(self, table_name: str, trigger: bool):
        """Set trigger ON/OFF for all jobs that consume the table."""
        uow = self.uow
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}

            jobs = uow.job_table_links.get_jobs_by_table_and_io_type(table.id, "input")
            changed, unchanged = [], []
            for j in jobs:
                trig_list = list(j.trigger_tables or [])
                has = table_name in trig_list
                if trigger and not has:
                    trig_list.append(table_name)
                    j.trigger_tables = trig_list
                    changed.append(j.job_id)
                elif not trigger and has:
                    j.trigger_tables = [t for t in trig_list if t != table_name]
                    changed.append(j.job_id)
                else:
                    unchanged.append(j.job_id)
                # Edge flag best-effort
                try:
                    uow.edges.set_input_trigger(j.id, table.id, trigger)
                except Exception:
                    pass

            uow.commit()
            self._invalidate_trigger_cache(table_name)

            return {
                "status": "success",
                "table_name": table_name,
                "trigger": bool(trigger),
                "changed": changed,
                "unchanged": unchanged,
                "count": len(changed),
                "total": len(jobs),
            }
        except Exception as e:
            logger.error(f"bulk_set_table_triggers failed for {table_name}: {e}")
            uow.rollback()
            return {"status": "error", "message": str(e)}

    # --- Helpers ---

    def _create_job_node(self, job_data: JobRegister):
        return self.uow.jobs.get_or_create(
            job_data.job_id,
            labels=job_data.labels or {},
            owner=job_data.owner,
            write_mode=job_data.write_mode,
            destination_type=job_data.destination_type,
            destination_table=job_data.destination_table,
            trigger_tables=job_data.trigger_tables,
            reference_tables=job_data.reference_tables,
            job_metadata=job_data.metadata or {},
        )

    def _process_reference_tables(self, job, job_data: JobRegister) -> List[int]:
        in_ids = []
        if not job_data.reference_tables:
            return in_ids

        logger.debug(f"Processing {len(job_data.reference_tables)} reference tables")
        for t in job_data.reference_tables:
            tbl = self.uow.tables.get_or_create(t)
            in_ids.append(tbl.id)
            self.uow.job_table_links.link_job_table(job.id, tbl.id, "input")
            is_trigger_on = t in (job_data.trigger_tables or [])
            self.uow.edges.create_job_table_edge(
                job.id, tbl.id, "input", is_trigger_on=is_trigger_on
            )
        return in_ids

    def _process_destination_table(self, job, job_data: JobRegister):
        if not job_data.destination_table:
            return
        
        logger.debug(f"Processing destination table: {job_data.destination_table}")
        tbl = self.uow.tables.get_or_create(job_data.destination_table)
        self.uow.job_table_links.link_job_table(job.id, tbl.id, "output")
        self.uow.edges.create_job_table_edge(job.id, tbl.id, "output")

    def _create_upstream_relationships(self, job, in_ids: List[int]):
        logger.debug("Calculating upstream relationships")
        if not in_ids:
            return

        try:
            up_jobs = self.uow.jobs.find_upstream_jobs_by_output_tables(in_ids, job.id)
            for up in up_jobs:
                logger.debug(f"Creating dependency edge: {up} -> {job.id}")
                self.uow.edges.add(up, job.id, "job", "job", "dependency")
                self.uow.closures.add_direct(up, job.id)
                self.uow.closures.expand_closure(up, job.id)
        except Exception as e:
            logger.error(f"Error querying/creating upstream jobs: {e}")

    def _invalidate_trigger_cache(self, table_name: str):
        try:
            from lineage_manager.core.config import get_settings
            settings = get_settings()
            if settings.redis.enabled:
                import redis
                r = redis.Redis(
                    host=settings.redis.host,
                    port=settings.redis.port,
                    db=settings.redis.db,
                    decode_responses=True,
                )
                cache_key = f"triggers:{table_name}"
                r.delete(cache_key)
        except Exception:
            pass

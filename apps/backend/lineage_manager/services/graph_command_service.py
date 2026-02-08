import logging
from typing import Any, Dict, List, Optional

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.api.v1.schemas import JobUpdateRequest
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.scheduling_lineage import SchedulingLineage

logger = logging.getLogger(__name__)


class GraphCommandService:
    """
    Command Service (WRITE)

    ⚠️ IMPORTANT - TRANSACTION POLICY:
    - This service MUST NOT manage transactions.
    - Do NOT use `with self.uow:` in this class (will raise RuntimeError).
    - Commit/rollback is owned by Orchestrator services
      (GraphSyncService, GraphInitializerService).

    This class only stages graph mutations.
    Orchestrator services wrap calls with `with uow.transactional():`.

    Example:
        # ❌ WRONG (will raise RuntimeError):
        with self.uow:
            self.register_job(...)

        # ✅ CORRECT (in Orchestrator):
        with command_service.uow.transactional():
            command_service.register_job(...)
    """

    def __init__(self, uow: GraphUnitOfWork, job_manager: JobManagerAdapter):
        self.uow = uow
        self.job_manager = job_manager

        # Disable context manager usage in this service
        self.uow._allow_context = False
 

    def toggle_job_enabled(self, job_id: str):
        """
        Flip enabled flag stored in job.job_metadata and expose attribute.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        job = self.uow.jobs.get(job_id)
        if not job:
            return None
        meta = dict(job.job_metadata or {})
        current = bool(meta.get("enabled", True))
        meta["enabled"] = not current
        # keep status default if missing
        meta.setdefault("status", "pending")
        job.job_metadata = meta

        # Attach for response convenience
        setattr(job, "enabled", meta["enabled"])
        setattr(job, "status", meta.get("status"))
        return job

    def update_job(
        self, job_id: str, payload: JobUpdateRequest
    ) -> Optional[Dict[str, Any]]:
        """
        Update job mutable fields.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
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

        return {
            "job_id": job_id,
            "updated": updates,
            "message": f"Job '{job_id}' updated successfully.",
        }

    def update_job_metadata(self, job_node: Any, lineage: SchedulingLineage):
        """
        Update only metadata for an existing job node.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        new_props = self._extract_job_properties(lineage)

        # Update flat properties on the JobNode/Search Node as well if needed
        # But primarily update the main 'job' table's metadata JSON
        job_node.job_metadata = new_props

        # Extract project and owners from new structure
        project_id = lineage.get_project() or "default-project"
        owners = lineage.get_owner()

        # Also sync to JobNode for search
        self.uow.job_node.create_or_update(
            node_id=job_node.id,
            job_id=lineage.job_id,
            project_id=project_id,
            owners=owners,
            properties=new_props,
        )

    def touch_job_timestamp(self, job_node: Any):
        """
        Update the updated_at timestamp for a job.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        from datetime import datetime

        job_node.updated_at = datetime.utcnow()

    def reset_graph(self):
        """
        Delete all graph-related table data.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        from sqlalchemy import text

        uow = self.uow
        logger.info("Starting graph reset - clearing all graph data")

        # Disable FK checks for TRUNCATE to work and be fast
        uow.db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        try:
            # Order matters: closure → edge → job_table_link → job → table
            uow.closures.clear_all()
            uow.edges.clear_all()
            uow.job_table_links.clear_all()
            uow.jobs.clear_all()
            uow.tables.clear_all()

            # Clear new meta tables
            uow.job_node.clear_all()
            uow.data_node.clear_all()
            # NOTE: We specifically DO NOT clear uow.project and uow.users.
            # These tables contain administrative data (SSO users, permissions)
            # that must persist across graph initializations.

            # Clear health stats and other caches
            self._invalidate_all_caches()

            logger.info("Graph reset completed: all graph data cleared.")
        finally:
            uow.db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

        return {
            "status": "success",
            "message": "Graph reset complete: all graph data cleared.",
        }

    def set_table_dependency(self, table_name: str, job_id: str, dependency_type: str):
        """Set dependency type (HARD/SOFT) for a specific job consuming a given table."""
        uow = self.uow
        logger.info(
            f"set_table_dependency {job_id}/{table_name}: dependency_type: {dependency_type}"
        )
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}
            job = uow.jobs.get(job_id)
            if not job:
                return {"status": "error", "message": f"Job '{job_id}' not found"}

            trig_list = list(job.trigger_tables or [])
            prev = table_name in trig_list
            is_hard = dependency_type.upper() == "HARD"

            if is_hard and not prev:
                trig_list.append(table_name)
            elif not is_hard and prev:
                trig_list = [t for t in trig_list if t != table_name]
            job.trigger_tables = trig_list

            # Update edge dependency_type
            try:
                uow.edges.update_dependency_type(
                    table.id, job.id, dependency_type.upper()
                )
            except Exception:
                pass

            self._invalidate_dependency_cache(table_name)

            return {
                "status": "success",
                "job_id": job_id,
                "table_name": table_name,
                "previous_state": "HARD" if prev else "SOFT",
                "new_state": dependency_type.upper(),
            }
        except Exception as e:
            logger.error(f"Failed to set dependency for {job_id}/{table_name}: {e}")
            return {"status": "error", "message": str(e)}

    def bulk_set_table_dependencies(self, table_name: str, dependency_type: str):
        """Set dependency type (HARD/SOFT) for all jobs that consume the table."""
        uow = self.uow
        try:
            table = uow.tables.get_by_full_name(table_name)
            if not table:
                return {"status": "error", "message": f"Table '{table_name}' not found"}

            jobs = uow.job_table_links.get_jobs_by_table_and_io_type(table.id, "input")
            changed, unchanged = [], []
            is_hard = dependency_type.upper() == "HARD"

            for j in jobs:
                trig_list = list(j.trigger_tables or [])
                has = table_name in trig_list
                if is_hard and not has:
                    trig_list.append(table_name)
                    j.trigger_tables = trig_list
                    changed.append(j.job_id)
                elif not is_hard and has:
                    j.trigger_tables = [t for t in trig_list if t != table_name]
                    changed.append(j.job_id)
                else:
                    unchanged.append(j.job_id)
                # Update edge dependency_type
                try:
                    uow.edges.update_dependency_type(
                        table.id, j.id, dependency_type.upper()
                    )
                except Exception:
                    pass

            self._invalidate_dependency_cache(table_name)

            return {
                "status": "success",
                "table_name": table_name,
                "dependency_type": dependency_type.upper(),
                "changed": changed,
                "unchanged": unchanged,
                "count": len(changed),
                "total": len(jobs),
            }
        except Exception as e:
            logger.error(f"bulk_set_table_dependencies failed for {table_name}: {e}")
            return {"status": "error", "message": str(e)}

    # --- Helpers ---


    def preview_lineage_job(self, lineage: SchedulingLineage) -> dict:
        """
        Preview what would change if we sync this lineage.
        """
        props = lineage.properties or lineage.metadata or {}

        changes = {
            "job_node": None,
            "nodes_created": [],
            "nodes_updated": [],
            "edges_created": [],
        }

        # 1. Check Job Node
        existing_job = self.uow.jobs.get(lineage.job_id)
        if existing_job:
            new_props = self._extract_job_properties(props, lineage)
            old_props = existing_job.job_metadata or {}

            fields_changed = []
            old_values = {}
            new_values = {}

            for key in new_props:
                if key not in old_props or old_props[key] != new_props[key]:
                    fields_changed.append(key)
                    old_values[key] = old_props.get(key)
                    new_values[key] = new_props[key]

            if fields_changed:
                changes["job_node"] = {
                    "action": "update",
                    "fields_changed": fields_changed,
                    "old_values": old_values,
                    "new_values": new_values,
                }
        else:
            changes["job_node"] = {
                "action": "create",
                "properties": self._extract_job_properties(props, lineage),
            }

        # 2. Check Upstream Nodes
        seen_upstreams = set()
        for upstream in lineage.upstreams:
            if upstream.name in seen_upstreams:
                continue
            seen_upstreams.add(upstream.name)

            existing_node = self.uow.tables.get_by_full_name(upstream.name)
            if not existing_node:
                changes["nodes_created"].append(
                    {"type": upstream.type, "name": upstream.name}
                )

            changes["edges_created"].append(
                {"source": upstream.name, "target": lineage.job_id, "label": "input"}
            )

        # 3. Check Downstream Nodes
        seen_downstreams = set()
        for downstream in lineage.downstreams:
            if downstream.name in seen_downstreams:
                continue
            seen_downstreams.add(downstream.name)

            existing_node = self.uow.tables.get_by_full_name(downstream.name)
            if not existing_node:
                changes["nodes_created"].append(
                    {"type": downstream.type, "name": downstream.name}
                )

            changes["edges_created"].append(
                {"source": lineage.job_id, "target": downstream.name, "label": "output"}
            )

        return changes

    def _create_upstream_relationships(
        self, job, in_ids: List[int], compute_closure: bool = True
    ):
        logger.debug("Calculating upstream relationships")
        if not in_ids:
            return

        try:
            # Result is List[tuple[source_job_id, connecting_table_id]]
            up_job_links = self.uow.jobs.find_upstream_jobs_by_output_tables(in_ids, job.id)
            
            # Group by upstream job
            job_to_tables = {}
            for up_id, table_id in up_job_links:
                job_to_tables.setdefault(up_id, set()).add(table_id)

            for up_id, table_ids in job_to_tables.items():
                # Resolve table names for better readability in properties
                table_names = []
                for tid in table_ids:
                    node = self.uow.tables.get_by_id(tid)
                    if node:
                        table_names.append(node.name)

                logger.debug(f"Creating dependency edge: {up_id} -> {job.id} (via {table_names})")
                self.uow.edges.add(
                    up_id, 
                    job.id, 
                    "job", 
                    "job", 
                    "dependency",
                    properties={"intermediate_tables": table_names}
                )

                if compute_closure:
                    self.uow.closures.add_direct(up_id, job.id)
                    self.uow.closures.expand_closure(up_id, job.id)
        except Exception as e:
            logger.error(f"Error querying/creating upstream jobs: {e}")
            raise

    def _create_downstream_relationships(
        self, job, out_ids: List[int], compute_closure: bool = True
    ):
        logger.debug("Calculating downstream relationships (forward dependencies)")
        if not out_ids:
            return

        try:
            for out_id in out_ids:
                # Resolve table name
                table_node = self.uow.tables.get_by_id(out_id)
                table_name = table_node.name if table_node else f"unknown:{out_id}"

                # Find jobs that consume this table
                consumer_jobs = self.uow.job_table_links.get_jobs_by_table_and_io_type(
                    out_id, "input"
                )
                for consumer in consumer_jobs:
                    if consumer.id == job.id:
                        continue
                    logger.debug(
                        f"Creating forward dependency edge: {job.id} -> {consumer.id} (via {table_name})"
                    )
                    self.uow.edges.add(
                        job.id, 
                        consumer.id, 
                        "job", 
                        "job", 
                        "dependency",
                        properties={"intermediate_tables": [table_name]}
                    )

                    if compute_closure:
                        self.uow.closures.add_direct(job.id, consumer.id)
                        self.uow.closures.expand_closure(job.id, consumer.id)
        except Exception as e:
            logger.error(f"Error querying/creating downstream jobs: {e}")
            raise

    # --- Changed: register_lineage_job implementation ---
    def register_lineage_job(
        self, lineage: SchedulingLineage, compute_closure: bool = True
    ) -> str:
        """
        Register a job described via SchedulingLineage payload directly to graph.

        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        if not lineage.job_id: # Already stripped in model
            raise ValueError("job_id cannot be empty")

        uow = self.uow
        job_props = self._extract_job_properties(lineage)
        
        # 0. Extract owners and project, ensure they exist FIRST
        common_owners = lineage.get_owner()
        project_id = lineage.get_project() or "unknown-project"
        
        # Ensure Project exists in catalog
        self.uow.project.create_or_update(
            project_id=project_id,
            display_name=project_id.replace("-", " ").replace("_", " ").title(),
        )
        
        # Ensure all owners exist in catalog (user_account table) BEFORE creating job
        for owner_id in common_owners:
            self.uow.users.create_or_update_catalog_user(
                user_id=owner_id, 
                name=owner_id.split("@")[0].replace(".", " ").title()
            )

        # 1. Create or Update Job Node (Base)
        job = uow.jobs.get(lineage.job_id)
        if job:
            # Update properties directly
            for key, value in job_props.items():
                if hasattr(job, key):
                    setattr(job, key, value)
                else:
                    job._set_prop(key, value)
        else:
            # Create new job node with flat properties
            job = uow.jobs.get_or_create(
                job_id=lineage.job_id, name=lineage.get_name(), **job_props
            )

        # 2. Process Upstream Nodes (Inputs) -> Data Assets
        input_data_ids = []
        seen_upstreams = set()

        for upstream in lineage.upstreams:
            name = upstream.name
            if name in seen_upstreams:
                continue
            seen_upstreams.add(name)

            # Register as DataNode
            node = uow.tables.get_or_create(name) # Base representation as table
            
            # --- [NEW] Populate Table Info Properties (Upstream) ---
            if upstream.storage:
                node.storage_type = upstream.storage
            # -------------------------------------------------------

            input_data_ids.append(node.id)

            uow.job_table_links.link_job_table(job.id, node.id, "input")

            # Use trigger field (boolean: true = trigger, false = reference)
            trigger = upstream.trigger if upstream.trigger is not None else False
            self.uow.edges.create_job_table_edge(
                job.id, node.id, "input", trigger=trigger
            )

            # Update DataNode sidecar            
            data_type = upstream.type            
            data_info = self._extract_data_info(name, upstream)
            uow.data_node.create_or_update(
                node_id=node.id,
                data_id=name,
                data_type=data_type,
                data_info=data_info
            )

        # 3. Process Downstream Nodes (Outputs) -> Data Assets
        output_data_ids = []
        seen_downstreams = set()
        for downstream in lineage.downstreams:
            name = downstream.name
            if name in seen_downstreams:
                continue
            seen_downstreams.add(name)

            node = uow.tables.get_or_create(name)
            
            # --- [NEW] Populate Table Info Properties (Downstream) ---
            if downstream.storage:
                node.storage_type = downstream.storage
            if downstream.write_mode:
                node.write_mode = downstream.write_mode
            # ---------------------------------------------------------

            output_data_ids.append(node.id)

            uow.job_table_links.link_job_table(job.id, node.id, "output")
            self.uow.edges.create_job_table_edge(job.id, node.id, "output")
            
            # Update DataNode sidecar
            orig_type = (downstream.type or "BIGQUERY").upper()
            data_type = "BIGQUERY" if orig_type == "TABLE" else orig_type

            data_info = self._extract_data_info(name, downstream)
            uow.data_node.create_or_update(
                node_id=node.id,
                data_id=name,
                data_type=data_type,
                data_info=data_info
            )

        # 4. Create Job-to-Job Dependencies
        self._create_upstream_relationships(
            job, input_data_ids, compute_closure=compute_closure
        )
        self._create_downstream_relationships(
            job, output_data_ids, compute_closure=compute_closure
        )

        # 5. Populate Search & Catalog Tables
        # (Users and project already created at the beginning)
        primary_owner = common_owners[0] if common_owners else "unknown-owner"

        # Populate JobNode for search (with owners list)
        self.uow.job_node.create_or_update(
            node_id=job.id,
            job_id=lineage.job_id,
            project_id=project_id,
            owners=common_owners,
            properties=job_props,
        )

        return job.id

    def _extract_data_info(self, name: str, node_info: Any) -> dict:
        """Extract sidecar metadata for views."""
        info = {}
        raw_type = getattr(node_info, "type", "BIGQUERY")
        data_type = (raw_type or "BIGQUERY").upper()
        
        # Normalize 'TABLE' to 'BIGQUERY'
        if data_type == "TABLE":
            data_type = "BIGQUERY"

        if data_type == "BIGQUERY":
            # Assume proj.dataset.table
            parts = name.split(".")
            if len(parts) >= 3:
                info["project"] = parts[0]
                info["dataset"] = parts[1]
                info["table"] = parts[2]
            elif len(parts) == 2:
                info["dataset"] = parts[0]
                info["table"] = parts[1]
            else:
                info["table"] = name
        elif data_type in ("S3", "GCS"):
            # Assume s3://bucket/path
            if "://" in name:
                path_part = name.split("://")[1]
                parts = path_part.split("/", 1)
                info["bucket"] = parts[0]
                if len(parts) > 1:
                    info["prefix"] = parts[1]
            else:
                info["bucket"] = name
        
        # Add basic storage info if available
        if hasattr(node_info, "storage") and node_info.storage:
            info["storage_details"] = node_info.storage
            
        return info

    def _parse_table_name(self, full_name: str) -> tuple[str, str]:
        """Parse table name into dataset and table_name."""
        parts = full_name.split(".")
        if len(parts) >= 2:
            return parts[-2], parts[-1]
        return "default", full_name

    def rebuild_closure(self):
        """Delegate rebuild_closure to the repository via UOW"""
        self.uow.closures.rebuild_closure()

    # --- Helpers moved from GraphSyncService ---

    def _extract_job_properties(self, lineage: SchedulingLineage) -> dict:
        """Extract job properties from SchedulingLineage, supporting both old and new formats."""
        
        # Use helper methods to get values from either structure
        job_type = lineage.get_type()
        job_status = lineage.get_status()
        job_schedule = lineage.get_schedule()
        
        job_props = {
            "type": job_type,
            "status": job_status     
        }

        # Handle new nested metadata structure
        if lineage.metadata:
            meta = lineage.metadata
            
            # Extract owners (store all owners)
            if meta.owner:
                job_props["owners"] = meta.owner  # Store full list
            
            # Flatten job_meta into root properties
            # This makes fields like logic_type, description, schedule directly accessible
            if meta.job_meta:
                job_meta_data = meta.job_meta.model_dump(exclude_none=True)
                # Ensure labels and schedule are handled specifically if needed, 
                # but model_dump already includes them.
                for k, v in job_meta_data.items():
                    if k not in job_props:
                        job_props[k] = v
            
            # Extract project
            project = meta.get_project()
            if project:
                job_props["project"] = project
            
            # Extract encryption configs
            if meta.enc_configs:
                job_props["enc_configs"] = meta.enc_configs
        
        # Schedule is already flattened from job_meta above if it existed there.
        # But we keep this for backward compatibility with old payload structure.
        if job_schedule and "schedule" not in job_props:
            job_props["schedule"] = job_schedule.model_dump(exclude_none=True)

        # REDUNDANT: Stop storing upstreams and downstreams in the JSON properties.
        # They are already provided at the top level of the API response via edges.
            
        # Filter out None or empty values to keep properties clean
        return {
            k: v
            for k, v in job_props.items()
            if v is not None and (not isinstance(v, (list, dict)) or v)
        }

    def _invalidate_all_caches(self):
        """Best effort to clear graph-related caches in Redis."""
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
                # Clear health stats
                r.delete("health_stats")
                r.delete("health_stats_v2")  # Just in case

                # Clear neighbors caches (keys starting with neighbors:)
                keys = r.keys("neighbors:*")
                if keys:
                    r.delete(*keys)
                # Clear DAG caches
                keys = r.keys("dag:*")
                if keys:
                    r.delete(*keys)
                logger.info(f"Redis caches cleared during reset.")
        except Exception as e:
            logger.warning(f"Failed to clear Redis caches: {e}")

    def _invalidate_dependency_cache(self, table_name: str):
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

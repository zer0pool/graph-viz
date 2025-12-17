import logging
from typing import Any, Dict, List, Optional

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.api.v1.schemas import JobRegister, JobUpdateRequest
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_query_service import GraphQueryService

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
    
    def __init__(
        self,
        uow: GraphUnitOfWork,
        job_manager: JobManagerAdapter,
        query_service: Optional[GraphQueryService] = None
    ):
        self.uow = uow
        self.job_manager = job_manager
        self.query_service = query_service
        
        # Disable context manager usage in this service
        self.uow._allow_context = False

    def register_job(self, job_data: JobRegister) -> str:
        """
        Register a new job in the system.
        
        ⚠️ Does NOT commit - caller must wrap with transaction.
        
        Example (in Orchestrator):
            with command_service.uow.transactional():
                job_id = command_service.register_job(job_data)
        """
        logger.info(f"Starting job registration for job_id: {job_data.job_id}")
        uow = self.uow
        
        job = self._create_job_node(job_data)
        in_ids = self._process_reference_tables(job, job_data)
        self._process_destination_tables(job, job_data)
        self._create_upstream_relationships(job, in_ids)
        
        logger.info(f"Job registration completed successfully for job_id: {job.job_id}")
        return job.id



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
            
    def update_job(self, job_id: str, payload: JobUpdateRequest) -> Optional[Dict[str, Any]]:
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
    def reset_graph(self):
        """
        Delete all graph-related table data.
        
        ⚠️ Does NOT commit - caller must wrap with transaction.
        """
        uow = self.uow
        logger.info("Starting graph reset - clearing all graph data")
        # Order matters: closure → edge → job_table_link → job → table
        uow.closures.clear_all()
        uow.edges.clear_all()
        uow.job_table_links.clear_all()
        uow.jobs.clear_all()
        uow.tables.clear_all()
        logger.info("Graph reset completed: all graph data cleared.")
        
        if self.query_service:
            self.query_service.invalidate_graph_snapshot()

        return {
            "status": "success",
            "message": "Graph reset complete: all graph data cleared.",
        }

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

            with uow:
                pass
            
            if self.query_service:
                self.query_service.invalidate_graph_snapshot()

            return {
                "status": "success",
                "job_id": job_id,
                "table_name": table_name,
                "previous_state": bool(prev),
                "new_state": bool(trigger),
            }
        except Exception as e:
            logger.error(f"Failed to set trigger for {job_id}/{table_name}: {e}")
            return {"status": "error", "message": str(e)}

    def bulk_set_table_triggers(self, table_name: str, trigger: bool):
        """Set trigger ON/OFF for all jobs that consume the table."""
        uow = self.uow
        try:
            with uow:
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
            
            if self.query_service:
                self.query_service.invalidate_graph_snapshot()

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
            return {"status": "error", "message": str(e)}

    # --- Helpers ---

    def _create_job_node(self, job_data: JobRegister):
        return self.uow.jobs.get_or_create(
            job_data.job_id,
            labels=job_data.labels or {},
            owner=job_data.owner,
            write_mode=job_data.write_mode,
            destination_types=job_data.destination_types,
            destination_tables=job_data.destination_tables,
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

    def _process_destination_tables(self, job, job_data: JobRegister):
        if not job_data.destination_tables:
            return
        
        logger.debug(f"Processing destination tables: {job_data.destination_tables}")
        for t in job_data.destination_tables:
            tbl = self.uow.tables.get_or_create(t)
            self.uow.job_table_links.link_job_table(job.id, tbl.id, "output")
            self.uow.edges.create_job_table_edge(job.id, tbl.id, "output")

    def preview_lineage_job(self, lineage: SchedulingLineage) -> dict:
        """
        Preview what would change if we sync this lineage.
        """
        props = lineage.properties or lineage.metadata or {}
        
        changes = {
            "job_node": None,
            "nodes_created": [],
            "nodes_updated": [],
            "edges_created": []
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
                    "new_values": new_values
                }
        else:
            changes["job_node"] = {
                "action": "create",
                "properties": self._extract_job_properties(props, lineage)
            }
        
        # 2. Check Upstream Nodes
        seen_upstreams = set()
        for upstream in lineage.upstreams:
            if upstream.name in seen_upstreams:
                continue
            seen_upstreams.add(upstream.name)
            
            existing_node = self.uow.tables.get_by_full_name(upstream.name)
            if not existing_node:
                changes["nodes_created"].append({
                    "type": upstream.type,
                    "name": upstream.name
                })
            
            changes["edges_created"].append({
                "source": upstream.name,
                "target": lineage.job_id,
                "label": "input"
            })
        
        # 3. Check Downstream Nodes
        seen_downstreams = set()
        for downstream in lineage.downstreams:
            if downstream.name in seen_downstreams:
                continue
            seen_downstreams.add(downstream.name)
            
            existing_node = self.uow.tables.get_by_full_name(downstream.name)
            if not existing_node:
                changes["nodes_created"].append({
                    "type": downstream.type,
                    "name": downstream.name
                })
            
            changes["edges_created"].append({
                "source": lineage.job_id,
                "target": downstream.name,
                "label": "output"
            })
        
        return changes

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

    # --- Changed: register_lineage_job implementation ---
    def register_lineage_job(self, lineage: SchedulingLineage) -> str:
        """
        Register a job described via SchedulingLineage payload directly to graph.
        
        ⚠️ Does NOT commit - caller must wrap with transaction.
        
        Example (in Orchestrator):
            with self.uow.transactional():
                job_id = command_service.register_lineage_job(lineage)
        """
        uow = self.uow
        props = lineage.properties or lineage.metadata or {}

        # 1. Create or Update Job Node
        job = uow.jobs.get(lineage.job_id)
        if job:
            # Update existing job properties
            job_props = self._extract_job_properties(props, lineage)
            job.job_metadata = job_props
        else:
            # Create new job
            job_props = self._extract_job_properties(props, lineage)
            job = uow.jobs.get_or_create(
                job_id=lineage.job_id,
                name=lineage.name,
                job_metadata=job_props,
            )

        # 2. Process Upstream Nodes (Inputs)
        input_table_ids = []
        seen_upstreams = set()
        for upstream in lineage.upstreams:
            if upstream.name in seen_upstreams:
                continue
            seen_upstreams.add(upstream.name)

            upstream_node = uow.tables.get_or_create(upstream.name)
            input_table_ids.append(upstream_node.id)

            uow.job_table_links.link_job_table(job.id, upstream_node.id, "input")
            uow.edges.create_job_table_edge(
                job.id, upstream_node.id, "input"
            )

        # 3. Process Downstream Nodes (Outputs)
        seen_downstreams = set()
        for downstream in lineage.downstreams:
            if downstream.name in seen_downstreams:
                continue
            seen_downstreams.add(downstream.name)

            downstream_node = uow.tables.get_or_create(downstream.name)

            uow.job_table_links.link_job_table(job.id, downstream_node.id, "output")
            uow.edges.create_job_table_edge(
                job.id, downstream_node.id, "output"
            )

        # 4. Create Job-to-Job Dependencies (Upstream Job -> This Job)
        # We reuse the logic that finds jobs producing our input tables
        self._create_upstream_relationships(job, input_table_ids)
        
        # No commit - orchestrator handles it
        
        return job.id

    # --- Helpers moved from GraphSyncService ---

    def _extract_job_properties(
        self,
        props: dict,
        lineage: SchedulingLineage
    ) -> dict:
        ALLOWED_KEYS = {
            "owner", "schedule", "write_mode", "scheduling_type",
            "configurations", "revision_ids", "status", "draft_status",
            "destination", "labels", "run_status",
            "create_datetime", "update_datetime"
        }
        
        job_props = {}
        for key in ALLOWED_KEYS:
            if key in props:
                job_props[key] = props[key]
        
        if lineage.schedule:
            job_props["schedule"] = lineage.schedule.dict()
        
        if lineage.create_datetime:
            job_props["create_datetime"] = lineage.create_datetime.isoformat()
        if lineage.update_datetime:
            job_props["update_datetime"] = lineage.update_datetime.isoformat()
        
        job_props["trigger_tables"] = self._extract_triggers(lineage.upstreams)
        job_props["reference_tables"] = self._extract_references(lineage.upstreams)
        job_props["destination_tables"] = self._extract_destinations(lineage.downstreams)
        
        return job_props

    def _create_or_update_node(
        self,
        item,
        metadata_prefix: str,
        lineage_props: dict
    ):
        node_type = item.type
        node_name = item.name
        node_metadata = self._extract_node_metadata(item, metadata_prefix, lineage_props)
        
        if node_type == "table":
            node = self.uow.tables.get_or_create(    
                full_name=node_name,
                table_metadata=node_metadata
            )
        else:
            node = self.uow.tables.get_or_create(        
                full_name=node_name,
                table_metadata={**node_metadata, "node_type": node_type}
            )
        return node

    def _extract_node_metadata(
        self,
        item,
        prefix: str,
        lineage_props: dict
    ) -> dict:
        node_metadata = {}
        prefix_key = f"{prefix}."
        
        for key, value in lineage_props.items():
            if key.startswith(prefix_key):
                clean_key = key[len(prefix_key):]
                node_metadata[clean_key] = value
        
        if "owner" in lineage_props:
            node_metadata["owner"] = lineage_props["owner"]
        
        if hasattr(item, 'trigger') and item.trigger:
            node_metadata['trigger'] = True
        
        return node_metadata

    def _extract_destinations(self, downstreams: list) -> List[str]:
        return [
            item.name
            for item in downstreams
            if item.type == "table"
        ]

    def _extract_triggers(self, upstreams: list) -> list:
        return [
            item.name
            for item in upstreams
            if item.type == "table" and getattr(item, "trigger", False)
        ]

    def _extract_references(self, upstreams: list) -> list:
        return [
            item.name
            for item in upstreams
            if item.type == "table"
        ]


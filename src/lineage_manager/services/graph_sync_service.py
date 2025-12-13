import logging
from typing import Any, Dict, List, Optional

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.models.job_data_transformer import JobDataTransformer
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_initializer import GraphInitializerService

logger = logging.getLogger(__name__)


class GraphSyncService:
    """
    Service responsible for synchronizing graph data from external sources 
    (Job Manager, Lineage Payloads).
    """
    
    _last_sync_result: Dict[str, Any] | None = None

    def __init__(
        self,
        uow: GraphUnitOfWork,
        job_manager: JobManagerAdapter,
        command_service: GraphCommandService,
        query_service: GraphQueryService,
        initializer_service: GraphInitializerService
    ):
        self.uow = uow
        self.job_manager = job_manager
        self.command_service = command_service
        self.query_service = query_service
        self.initializer_service = initializer_service

    # ========================================================================
    # Sync from Manager Methods
    # ========================================================================

    async def sync_job_from_manager(self, job_id: str) -> Dict[str, Any]:
        """Fetch a single job from Manager and register it to Graph."""
        try:
            jd = await self.job_manager.get_job(job_id)
            if not jd:
                return {
                    "status": "error",
                    "message": f"Job '{job_id}' not found in manager",
                }

            # Use the JobDataTransformer to transform the job data
            transformed_data = JobDataTransformer.transform_job_to_graph_node(jd)

            # Extract destination table from transformed data
            destination_table = transformed_data.get("destination_table")

            jr = JobRegister(
                job_id=jd.get("job_id", job_id),
                name=jd.get("name", job_id),
                labels=jd.get("labels", {}),
                owner=jd.get("owner"),
                write_mode=jd.get("write_mode"),
                destination_type=jd.get("destination_type"),
                destination_table=destination_table,
                trigger_tables=transformed_data.get("trigger_tables", []),
                reference_tables=transformed_data.get("reference_tables", []),
                run_status=jd.get("run_status", "RUN"),
                schedule=jd.get("schedule"),
                destinations=jd.get("destinations"),
                metadata=transformed_data.get("job_metadata", {}),
            )
            # Delegate to CommandService
            self.command_service.register_job(jr)
            return {"status": "success", "job_id": job_id}
        except Exception as e:
            logger.error(f"sync_job_from_manager failed: {e}")
            return {"status": "error", "message": str(e)}

    async def sync_node(self, node_type: str, node_db_id: int) -> Dict[str, Any]:
        """Sync a node (job or table) by re-fetching from Manager."""
        uow = self.uow
        if node_type == "job":
            job = uow.jobs.get_by_id(node_db_id)
            if not job:
                return {"status": "error", "message": f"job id={node_db_id} not found"}
            return await self.sync_job_from_manager(job.job_id)
        else:
            table = uow.tables.get_by_id(node_db_id)
            if not table:
                return {
                    "status": "error",
                    "message": f"table id={node_db_id} not found",
                }
            producers = uow.job_table_links.get_jobs_by_table_and_io_type(
                table.id, "output"
            )
            ok, fail = 0, 0
            for j in producers:
                res = await self.sync_job_from_manager(j.job_id)
                if res.get("status") == "success":
                    ok += 1
                else:
                    fail += 1
            return {
                "status": "success",
                "synced": ok,
                "failed": fail,
                "table": table.full_name,
            }

    def sync_from_payload(
        self, jobs: List[JobRegister], reset: bool = False
    ) -> Dict[str, Any]:
        """Sync graph from a list of JobRegister payloads."""
        if reset:
            self.command_service.reset_graph()

        success = 0
        errors: List[str] = []
        for j in jobs:
            try:
                self.command_service.register_job(j)
                success += 1
            except Exception as e:
                errors.append(f"{j.job_id}: {e}")

        stats = self.query_service.get_health_stats()
        result: Dict[str, Any] = {
            "status": "success" if not errors else "partial",
            "synced_jobs": success,
            "errors": errors,
            "database_stats": stats.get("database") if isinstance(stats, dict) else {},
        }
        GraphSyncService._last_sync_result = result
        return result

    async def sync_from_job_manager(self, reset: bool = False) -> Dict[str, Any]:
        """Sync graph by fetching all jobs from Job Manager."""
        if reset:
            self.command_service.reset_graph()
        result = await self.initializer_service.initialize()
        GraphSyncService._last_sync_result = result
        return result

    @classmethod
    def last_sync_status(cls) -> Dict[str, Any] | None:
        """Get the last sync result."""
        return getattr(cls, "_last_sync_result", None)

    # ========================================================================
    # Direct Lineage Sync Methods
    # ========================================================================

    def sync_single_job(
        self,
        lineage: SchedulingLineage,
        dry_run: bool = False
    ) -> dict:
        """Sync a single job lineage."""
        if dry_run:
            changes = self.preview_sync_from_lineage(lineage)
            return {
                "status": "dry_run",
                "job_id": lineage.job_id,
                "changes": changes
            }
        else:
            self.sync_from_lineage(lineage)
            self.uow.commit()
            return {
                "status": "success",
                "job_id": lineage.job_id,
                "message": f"Job {lineage.job_id} synced successfully"
            }

    async def sync_multiple_jobs(
        self,
        job_requests: List[Dict[str, str]],
        dry_run: bool = False
    ) -> dict:
        """Sync multiple jobs by fetching lineages from Job Manager."""
        lineages = await self.job_manager.fetch_lineages_by_ids(job_requests)
        
        if dry_run:
            results = []
            for lineage in lineages:
                changes = self.preview_sync_from_lineage(lineage)
                results.append({
                    "job_id": lineage.job_id,
                    "changes": changes
                })
            
            return {
                "status": "dry_run",
                "total_jobs": len(results),
                "results": results
            }
        else:
            results = []
            for lineage in lineages:
                try:
                    self.sync_from_lineage(lineage)
                    results.append({
                        "job_id": lineage.job_id,
                        "status": "success"
                    })
                except Exception as e:
                    logger.error(f"Failed to sync job {lineage.job_id}: {e}")
                    results.append({
                        "job_id": lineage.job_id,
                        "status": "error",
                        "message": str(e)
                    })
            
            self.uow.commit()
            
            return {
                "status": "success",
                "results": results,
                "total": len(results),
                "succeeded": sum(1 for r in results if r["status"] == "success"),
                "failed": sum(1 for r in results if r["status"] == "error")
            }

    def sync_from_lineage(self, lineage: SchedulingLineage) -> None:
        """Sync a single SchedulingLineage to the graph."""
        props = lineage.properties or lineage.metadata or {}
        
        # 1. Create/Update Job Node
        job_properties = self._extract_job_properties(props, lineage)
        
        self.uow.jobs.get_or_create(
            job_id=lineage.job_id,
            job_metadata=job_properties
        )
        
        # 2. Create Upstream Nodes & Edges
        seen_upstreams = set()
        for upstream in lineage.upstreams:
            if upstream.name in seen_upstreams:
                continue
            seen_upstreams.add(upstream.name)
            
            upstream_node = self._create_or_update_node(
                item=upstream,
                metadata_prefix="table",
                lineage_props=props
            )
            
            self.uow.edges.get_or_create(
                source_id=upstream_node.name,
                target_id=lineage.job_id,
                label="input"
            )
        
        # 3. Create Downstream Nodes & Edges
        seen_downstreams = set()
        for downstream in lineage.downstreams:
            if downstream.name in seen_downstreams:
                continue
            seen_downstreams.add(downstream.name)
            
            downstream_node = self._create_or_update_node(
                item=downstream,
                metadata_prefix="table",
                lineage_props=props
            )
            
            self.uow.edges.get_or_create(
                source_id=lineage.job_id,
                target_id=downstream_node.name,
                label="output"
            )

    def preview_sync_from_lineage(self, lineage: SchedulingLineage) -> dict:
        """Preview what would change if we sync this lineage."""
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
            
            existing_node = self.uow.tables.get(upstream.name)
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
            
            existing_node = self.uow.tables.get(downstream.name)
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

    # ========================================================================
    # Helpers
    # ========================================================================

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
        job_props["destination_table"] = self._extract_destination(lineage.downstreams)
        
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
                table_id=node_name,
                full_name=node_name,
                table_metadata=node_metadata
            )
        else:
            node = self.uow.tables.get_or_create(
                table_id=node_name,
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

    def _extract_destination(self, downstreams: list) -> Optional[str]:
        for item in downstreams:
            if item.type == "table":
                return item.name
        return None

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

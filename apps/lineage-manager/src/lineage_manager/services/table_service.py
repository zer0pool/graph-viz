import logging
from typing import Any, Dict, List, Optional

from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.bigquery_protocol import BigQueryServiceProtocol
from lineage_manager.core.sse import broker

logger = logging.getLogger(__name__)

class TableService:
    """Service layer for table-related business logic and orchestration."""

    def __init__(
        self,
        query_service: GraphQueryService,
        command_service: GraphCommandService,
        bigquery_service: BigQueryServiceProtocol,
    ):
        self.query_service = query_service
        self.command_service = command_service
        self.bigquery_service = bigquery_service

    def get_table_impact(self, table_name: str, max_depth: int, include_jobs: bool) -> Dict[str, Any]:
        """Return downstream tables impacted by a base table."""
        logger.info(f"Impact request for table={table_name}, max_depth={max_depth}")
        return self.query_service.get_table_impact(
            base_table=table_name, max_depth=max_depth, include_jobs=include_jobs
        )

    def get_table_dependencies(self, table_name: str) -> Dict[str, Any]:
        """Get trigger ON/OFF status per job that consumes the table."""
        if self._is_external_storage(table_name):
            return {"status": "success", "table": table_name, "count": 0, "jobs": []}
        return self.query_service.get_table_dependencies(table_name)

    def get_table_hierarchy(self, table_name: str) -> Dict[str, Any]:
        """Return full upstream/downstream lineage hierarchy."""
        return self.query_service.get_table_lineage_hierarchy(table_name)

    def get_table_lineage_summary(self, table_name: str, max_roots: int, max_leaves: int) -> Dict[str, Any]:
        """Return aggregated lineage metrics with schema compatibility fixes."""
        result = self.query_service.get_table_lineage_summary(
            table_name, max_roots=max_roots, max_leaves=max_leaves
        )
        
        # Ensure upstream/downstream sections carry both root/leaf keys for schema compatibility
        if result.get("status") == "success":
            result.setdefault("upstream", {}).setdefault("root_tables", [])
            result["upstream"].setdefault("leaf_tables", [])
            result.setdefault("downstream", {}).setdefault("leaf_tables", [])
            result["downstream"].setdefault("root_tables", [])
            
        return result

    async def set_table_dependency(self, table_name: str, job_id: str, trigger: bool) -> Dict[str, Any]:
        """Set trigger ON/OFF and emit SSE notification."""
        with self.command_service.uow.transactional():
            result = self.command_service.set_table_dependency(table_name, job_id, trigger)
        
        if result.get("status") == "success":
            await broker.publish("trigger_update", result)
        return result

    async def bulk_set_table_dependencies(self, table_name: str, trigger: bool) -> Dict[str, Any]:
        """Bulk set trigger ON/OFF and emit SSE for each changed job."""
        with self.command_service.uow.transactional():
            result = self.command_service.bulk_set_table_dependencies(table_name, trigger)
        
        if result.get("status") == "success":
            for jid in result.get("changed", []):
                await broker.publish(
                    "trigger_update",
                    {
                        "status": "success",
                        "job_id": jid,
                        "table_name": table_name,
                        "previous_state": None,
                        "new_state": trigger,
                    },
                )
        return result

    def get_table_details(self, table_name: str) -> Dict[str, Any]:
        """Get detailed metadata, handling external storage and demo fallbacks."""
        if self._is_external_storage(table_name):
            return {
                "status": "success",
                "result": {
                    "full_name": table_name,
                    "table_type": "EXTERNAL",
                    "description": "-",
                    "location": "-",
                    "created": "-",
                    "modified": "-",
                    "expires": None,
                    "labels": {},
                    "storage": {
                        "storage_type": "S3" if "s3" in table_name else "External",
                        "num_rows": "-",
                        "num_bytes": "-",
                    },
                },
            }

        # Handle demo fallback logic (previously in endpoint)
        target_table = "gizmopool.test_data.table_load_history"
        try:
            details = self.bigquery_service.get_table_detail(target_table)
            # Patch identity
            details["full_name"] = table_name
            return {"status": "success", "result": details}
        except Exception as e:
            logger.error(f"Failed to fetch table details for {table_name}: {e}")
            return {
                "status": "error", 
                "message": str(e),
                "result": {
                    "full_name": table_name,
                    "description": "Could not retrieve remote metadata."
                }
            }

    def get_table_load_history(self, table_name: str) -> Dict[str, Any]:
        """Return load timeline data."""
        timeline = self.bigquery_service.get_table_load_history(table_name)
        return {
            "status": "success",
            "input": {"table": table_name},
            "result": {"timeline": timeline},
        }

    def get_table_timelines(self, table_name: str, days: int) -> Dict[str, Any]:
        """Return timelines data."""
        payload = self.bigquery_service.get_table_timelines_for_table(table_name, days)
        return {
            "status": "success",
            "input": {"table": table_name, "days": days},
            "result": payload
        }

    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """Return table schema."""
        cols = self.bigquery_service.get_table_schema(table_name)
        return {
            "status": "success",
            "input": {"requested": table_name},
            "result": {"columns": cols}
        }

    def _is_external_storage(self, name: str) -> bool:
        """Check if table name represents external storage (S3/GCS)."""
        return (
            name.startswith("s3://") or 
            name.startswith("gs://") or 
            name.startswith("gcs://") or 
            "/" in name
        )

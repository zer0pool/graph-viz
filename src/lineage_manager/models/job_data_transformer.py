from typing import Any, Dict, List

from lineage_manager.api.v1.schemas import JobRegister
from lineage_manager.models.scheduling_lineage import SchedulingLineage


class JobDataTransformer:
    """Transforms Job Manager data to internal graph format."""

    @staticmethod
    def transform_job_to_graph_node(job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform job data from Job Manager to graph node format."""
        # Extract reference tables and trigger tables from upstreams
        reference_tables = []
        trigger_tables = []
        upstreams = job_data.get("upstreams", [])
        for upstream in upstreams:
            if upstream.get("type") == "table":
                table_name = upstream.get("name")
                if table_name:
                    reference_tables.append(table_name)
                    # Check if this table is a trigger table
                    if upstream.get("trigger", False):
                        trigger_tables.append(table_name)

        # Extract destination tables from downstreams
        destination_tables = []
        downstreams = job_data.get("downstreams", [])

        for downstream in downstreams:
            if downstream.get("type") == "table":
                table_name = downstream.get("name")
                if table_name:
                    destination_tables.append(table_name)
                    
        # Extract schedule information
        schedule = job_data.get("schedule", {})
        schedule_cron = schedule.get("interval") if schedule else None

        # Key attributes for the GraphJobNode
        key_fields = {
            "job_id": job_data.get("job_id"),
            "name": job_data.get("name", "Unknown Job"),  # Use name as the display name
            "owner": job_data.get("owner"),
            "labels": job_data.get("labels", {}),
            "write_mode": job_data.get("write_mode"),
            "destination_types": [job_data.get("destination_type")] if job_data.get("destination_type") else [],
            "destination_tables": destination_tables,
            "trigger_tables": trigger_tables,
            "reference_tables": reference_tables,
        }

        # All other fields go to metadata
        metadata_fields = {
            "schedule": schedule,
            "schedule_cron": schedule_cron,
            "reference_service": job_data.get("reference_service"),
            "configurations": job_data.get("configurations"),
            "create_datetime": job_data.get("create_datetime"),
            "update_datetime": job_data.get("update_datetime"),
            "successful_dag_runs_count": job_data.get("successful_dag_runs_count"),
            "run_status": job_data.get("run_status"),
            "destinations": job_data.get("destinations"),
            "upstreams": upstreams,
            "downstreams": downstreams,
        }

        return {
            **key_fields,
            "job_metadata": metadata_fields,
        }

    @staticmethod
    def transform_dependency_to_edge(dep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform dependency data from Job Manager to graph edge format."""
        return {
            "source_id": dep_data.get("source_job_id", dep_data.get("source")),
            "target_id": dep_data.get("target_job_id", dep_data.get("target")),
            "label": dep_data.get("dependency_type", "depends_on"),
        }

    @staticmethod
    def lineage_to_job_register(lineage: SchedulingLineage) -> JobRegister:
        """Convert a SchedulingLineage payload into the JobRegister schema."""
        upstream_tables = [
            dep.name
            for dep in lineage.upstreams
            if getattr(dep, "name", None)
        ]
        trigger_tables = [
            dep.name
            for dep in lineage.upstreams
            if getattr(dep, "name", None) and getattr(dep, "trigger", False)
        ]
        destination_tables = [
            dep.name 
            for dep in lineage.downstreams 
            if getattr(dep, "name", None)
        ]

        metadata = dict(lineage.metadata or {})
        schedule_payload = (
            lineage.schedule.model_dump()
            if getattr(lineage, "schedule", None)
            else metadata.get("schedule")
        )

        return JobRegister(
            job_id=lineage.job_id,
            name=lineage.name or lineage.job_id,
            labels=metadata.get("labels", {}),
            owner=metadata.get("owner"),
            write_mode=metadata.get("write_mode"),
            destination_types=[lineage.destination_type] if lineage.destination_type else getattr(metadata, "destination_types", []),
            destination_tables=destination_tables,
            trigger_tables=trigger_tables,
            reference_tables=upstream_tables,
            run_status=metadata.get("run_status", "RUN"),
            schedule=schedule_payload,
            destinations=metadata.get("destinations"),
            metadata=metadata,
        )

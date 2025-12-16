"""
BigQuery Service Protocol - Interface definition for all BigQuery service implementations.

This Protocol defines the contract that both RealBigQueryService and DummyBigQueryService
must implement, ensuring consistent behavior regardless of which implementation is selected.
"""

from typing import Protocol, List, Dict, Any


class BigQueryServiceProtocol(Protocol):
    """Protocol defining the interface for BigQuery metadata and timeline services.
    
    All BigQuery service implementations (Real and Dummy) must implement these methods
    with the exact same signatures to ensure interchangeability via DI Container Selector.
    """

    def get_table_schema(self, full_name: str) -> List[Dict[str, Any]]:
        """Fetch the schema (columns) for a BigQuery table.
        
        Args:
            full_name: Fully qualified table name (project.dataset.table)
            
        Returns:
            List of column definitions with name, type, mode, description, etc.
        """
        ...

    def get_table_detail(self, full_name: str) -> Dict[str, Any]:
        """Fetch detailed metadata for a BigQuery table.
        
        Args:
            full_name: Fully qualified table name (project.dataset.table)
            
        Returns:
            Dict containing table metadata including storage, partitioning, clustering, etc.
        """
        ...

    def get_table_timelines_for_table(
        self, table_name: str, days: int = 7
    ) -> Dict[str, Any]:
        """Fetch timeliness data showing load success/failure patterns over time.
        
        Args:
            table_name: Table name to query
            days: Number of days to look back (default: 7)
            
        Returns:
            Dict with daily_summary, hourly_detail, and time_range
        """
        ...

    def get_table_load_history(
        self, table_name: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch recent load history records for a table.
        
        Args:
            table_name: Table name to query
            limit: Maximum number of records to return (default: 50)
            
        Returns:
            List of load history records with run_id, status, duration, etc.
        """
        ...

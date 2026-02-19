from google.cloud import bigquery
from app.core.config import settings
import logging
from typing import Any, List, Dict

logger = logging.getLogger(__name__)

class BigQueryClient:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            # google-cloud library automatically uses GOOGLE_APPLICATION_CREDENTIALS
            self.client = bigquery.Client(project=settings.GOOGLE_PROJECT_ID)
            logger.info(f"Initialized BigQuery Client for project: {self.client.project}")
        except Exception as e:
            logger.error(f"Failed to initialize BigQuery Client: {e}")
            self.client = None

    def query(self, query_string: str) -> List[Dict[str, Any]]:
        """
        Executes a query and returns the result as a list of dictionaries.
        """
        if not self.client:
            raise RuntimeError("BigQuery client is not initialized")
        
        try:
            query_job = self.client.query(query_string)
            rows = query_job.result()  # Waits for job to complete.
            
            # Convert Row iterator to list of dicts for easier consumption
            results = [dict(row) for row in rows]
            return results
        except Exception as e:
            logger.error(f"BigQuery Query Failed: {e}\nQuery: {query_string}")
            raise

    def insert_rows(self, table_id: str, rows: List[Dict[str, Any]]) -> bool:
        """
        Stream rows into BigQuery.
        """
        if not self.client:
             raise RuntimeError("BigQuery client is not initialized")
        
        try:
            errors = self.client.insert_rows_json(table_id, rows)
            if errors:
                logger.error(f"Encountered errors while inserting rows: {errors}")
                return False
            logger.debug(f"Successfully inserted {len(rows)} rows into {table_id}")
            return True
        except Exception as e:
            logger.error(f"BigQuery Insert Failed: {e}")
            return False

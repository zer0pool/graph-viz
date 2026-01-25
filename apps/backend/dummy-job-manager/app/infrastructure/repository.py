import json
import os
from typing import List, Dict, Any, Optional

class LineageRepository:
    _instance = None
    _data: List[Dict[str, Any]] = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LineageRepository, cls).__new__(cls)
            cls._instance._load_data()
        return cls._instance

    def _load_data(self):
        # Assuming dummy_lineage.json is in the root /app directory in container
        # or current working directory locally.
        try:
            path = "dummy_lineage.json"
            if not os.path.exists(path):
                # Fallback to parent dir if running from app subdir? 
                # Ideally we run from root of dummy-job-manager
                if os.path.exists(f"../{path}"):
                    path = f"../{path}"
            
            if os.path.exists(path):
                with open(path, "r") as f:
                    content = json.load(f)
                    self._data = content.get("items", [])
                    print(f"Loaded {len(self._data)} jobs from {path}")
            else:
                print(f"WARNING: {path} not found. Repository empty.")
                self._data = []
        except Exception as e:
            print(f"ERROR loading lineage data: {e}")
            self._data = []

    def get_all(self) -> List[Dict[str, Any]]:
        return self._data

    def get_by_type(self, job_type: str) -> List[Dict[str, Any]]:
        return [j for j in self._data if j.get("type") == job_type]

    def get_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        for item in self._data:
            if item["job_id"] == job_id:
                return item
        return None

    def get_by_ids(self, job_ids: set) -> List[Dict[str, Any]]:
        return [j for j in self._data if j["job_id"] in job_ids]

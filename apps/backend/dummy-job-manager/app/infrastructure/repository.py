import json
import os
from typing import List, Dict, Any, Optional

class LineageRepository:
    def _load_file(self, filename: str) -> List[Dict[str, Any]]:
        # Try to locate the file in multiple possible locations
        possible_paths = [
            f"/app/data/lineage/{filename}",  # Container path
            f"app/data/lineage/{filename}",   # Local path from root
            f"data/lineage/{filename}"        # Local path relative to valid cwd
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    with open(path, "r") as f:
                        content = json.load(f)
                        return content.get("items", [])
                except Exception as e:
                    print(f"ERROR loading {path}: {e}")
                    return []
        
        print(f"WARNING: File {filename} not found in searched paths.")
        return []

    def get_lineage_data(self, scheduling_type: str) -> List[Dict[str, Any]]:
        if not scheduling_type:
            return []
            
        filename = f"{scheduling_type}.json"
        return self._load_file(filename)

    def get_all(self) -> List[Dict[str, Any]]:
        # Legacy support or fallback: allow loading all known types if needed?
        # For now, let's just return empty or maybe try to load commonly known ones if implied.
        # Given the new requirement is strict about directory mapping, getting "everything" 
        # is ambiguous unless we list the directory.
        # Let's list the directory to find all available types.
        all_items = []
        possible_dirs = ["/app/data/lineage", "app/data/lineage"]
        
        target_dir = None
        for d in possible_dirs:
            if os.path.isdir(d):
                target_dir = d
                break
        
        if target_dir:
            try:
                for f_name in os.listdir(target_dir):
                    if f_name.endswith(".json"):
                        items = self._load_file(f_name)
                        all_items.extend(items)
            except Exception as e:
                print(f"Error listing directory {target_dir}: {e}")
                
        return all_items

    def get_by_ids(self, job_ids: set) -> List[Dict[str, Any]]:
        # This is expensive if we have to load everything, but for a dummy manager it's fine.
        all_data = self.get_all()
        return [j for j in all_data if j["job_id"] in job_ids]
    
    def get_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        all_data = self.get_all()
        for item in all_data:
            if item["job_id"] == job_id:
                return item
        return None

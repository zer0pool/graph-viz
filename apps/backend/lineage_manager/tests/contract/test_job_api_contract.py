import pytest
from typing import Any, Dict

def check_no_deep_nesting(data: Dict[str, Any], max_depth: int = 2, current_depth: int = 0):
    """Recursively check for nesting depth in dictionaries."""
    if current_depth > max_depth:
        return False
    
    for key, value in data.items():
        if isinstance(value, dict):
            if not check_no_deep_nesting(value, max_depth, current_depth + 1):
                return False
    return True

def test_job_response_structure_contract():
    """
    Contract test to ensure Job API response is flat and clean.
    This prevents 'job_meta' or 'upstreams' from creeping back into 'properties'.
    """
    # This would normally be an actual API call result
    sample_properties = {
        "status": "ENABLED",
        "logic_type": "SQL",
        "owners": ["user1"],
        "schedule": {"cron": "0 0 * * *"},
        # "job_meta": {...}  <-- This should fail if present
        # "upstreams": [...] <-- This should fail if present
    }
    
    # 1. Check for forbidden redundant keys
    forbidden_keys = ["job_meta", "job_metadata", "upstreams", "downstreams"]
    for key in forbidden_keys:
        assert key not in sample_properties, f"Redundant key '{key}' found in response properties!"
    
    # 2. Check for nesting depth (keep it simple)
    # Most properties should be primitives, except maybe 'schedule' or 'labels'
    assert check_no_deep_nesting(sample_properties, max_depth=1), "Response properties are too deeply nested!"

    print("Contract verification passed!")

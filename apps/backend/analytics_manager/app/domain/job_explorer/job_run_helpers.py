"""
Job filtering, sorting, and facet computation helpers.
Extracted from the GraphQL resolver to keep resolvers thin (SRP).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional


def calculate_facets_from_runs(runs: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Compute distinct filter values (facets) from the full, unfiltered run list.
    Mutates run dicts to assign a deterministic status if one is missing.
    """
    status_options = ["Completed", "Error", "Active", "Queued"]
    all_owners: set = set()
    all_projects: set = set()
    all_types: set = set()
    all_issuers: set = set()
    all_statuses: set = set()

    for r in runs:
        for o in r.get("owners", []):
            if o:
                all_owners.add(str(o))
        if r.get("project_id"):
            all_projects.add(str(r["project_id"]))
        if r.get("type"):
            all_types.add(str(r["type"]))
        if r.get("issuer"):
            all_issuers.add(str(r["issuer"]))

        status = r.get("status")
        if not status:
            seed = len(str(r.get("job_id", ""))) + int(
                str(r.get("start_time", "0"))[-2:] or "0"
            )
            status = status_options[seed % len(status_options)]
            r["status"] = status
        all_statuses.add(status)

    return {
        "owners": sorted(all_owners),
        "projects": sorted(all_projects),
        "types": sorted(all_types),
        "issuers": sorted(all_issuers),
        "statuses": sorted(all_statuses),
    }


def apply_job_run_filters(
    runs: List[Dict[str, Any]],
    *,
    job_id: Optional[str] = None,
    dag_id: Optional[str] = None,
    types: Optional[List[str]] = None,
    destination: Optional[str] = None,
    owners: Optional[List[str]] = None,
    issuers: Optional[List[str]] = None,
    period: Optional[str] = None,
    projects: Optional[List[str]] = None,
    statuses: Optional[List[str]] = None,
    started_at_since: Optional[str] = None,
    started_at_until: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Apply all active filters to the run list and return the filtered subset."""
    result = runs

    if job_id:
        val = job_id.lower()
        result = [r for r in result if val in str(r.get("job_id", "")).lower()]
    if dag_id:
        val = dag_id.lower()
        result = [r for r in result if val in str(r.get("dag_id", "")).lower()]
    if types:
        t_list = [t.lower() for t in types if t]
        if t_list:
            result = [r for r in result if str(r.get("type", "")).lower() in t_list]
    if destination:
        val = destination.lower()
        result = [r for r in result if val in str(r.get("destination", "")).lower()]
    if owners:
        o_list = [o.lower() for o in owners if o]
        if o_list:
            result = [
                r
                for r in result
                if any(
                    o in [str(x).lower() for x in r.get("owners", [])] for o in o_list
                )
            ]
    if issuers:
        i_list = [i.lower() for i in issuers if i]
        if i_list:
            result = [r for r in result if str(r.get("issuer", "")).lower() in i_list]
    if period:
        val = period.lower()
        result = [r for r in result if val in str(r.get("period", "")).lower()]
    if projects:
        p_list = [p.lower() for p in projects if p]
        if p_list:
            result = [
                r for r in result if str(r.get("project_id", "")).lower() in p_list
            ]
    if statuses:
        s_list = [s.lower() for s in statuses if s]
        if s_list:
            result = [r for r in result if str(r.get("status", "")).lower() in s_list]
    if started_at_since:
        try:
            since_dt = datetime.fromisoformat(started_at_since.replace("Z", "+00:00"))
            result = [
                r
                for r in result
                if r.get("publish_time")
                and datetime.fromisoformat(r["publish_time"].replace("Z", "+00:00"))
                >= since_dt
            ]
        except (ValueError, TypeError):
            pass
    if started_at_until:
        try:
            until_dt = datetime.fromisoformat(started_at_until.replace("Z", "+00:00"))
            result = [
                r
                for r in result
                if r.get("publish_time")
                and datetime.fromisoformat(r["publish_time"].replace("Z", "+00:00"))
                <= until_dt
            ]
        except (ValueError, TypeError):
            pass

    return result


# Map frontend column IDs to backend dictionary keys
_SORT_FIELD_MAP: Dict[str, str] = {
    "job": "job_id",
    "dag": "dag_id",
    "project": "project_id",
    "start_time": "execution_time",
    "next_start": "next_start_time",
}


def sort_job_runs(
    runs: List[Dict[str, Any]],
    sort_by: Optional[str],
    descending: bool = True,
) -> List[Dict[str, Any]]:
    """Sort runs by a frontend column ID. Returns a new sorted list."""
    if not sort_by:
        return runs

    sort_key = _SORT_FIELD_MAP.get(sort_by, sort_by)

    def _get_val(x: Dict[str, Any]) -> str:
        val = x.get(sort_key)
        if val is None:
            return ""
        if isinstance(val, list):
            return val[0] if val else ""
        return str(val)

    return sorted(runs, key=_get_val, reverse=descending)

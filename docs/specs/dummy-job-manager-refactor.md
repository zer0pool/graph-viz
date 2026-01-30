# Specification: Refactor Dummy Job Manager (File-Based Responses)

## 1. Overview
Refactor the `dummy-job-manager` service to separate data from logic. Instead of generating data or loading a single huge JSON at startup, the service will read specific JSON files corresponding to API options. This allows for easy updates to the mock data by simply replacing JSON files, without changing code.

## 2. Goals
- **File-Based Routing**: Map API parameters (e.g., `scheduling_type`, `job_id`) to specific JSON files.
- **Hot-Swappable Data**: Allow users to update mock responses by modifying JSON files.
- **Organized Structure**: Store mock data in a structured directory layout.

## 3. Data Structure
Location: `apps/backend/dummy-job-manager/app/data/`

### A. Lineage Data (`app/data/lineage/`)
- `SELF-TYPE.json`: Response for `scheduling_type=SELF-TYPE`.
- `REQUEST-TYPE.json`: Response for `scheduling_type=REQUEST-TYPE`.
- `default.json`: Fallback if no type specified (or acts as "Request Type" default).

*Note*: These files should contain the `items` list (array of jobs).

### B. Run History (`app/data/run-history/`)
- `{job_id}.json`: Specific history for a job (e.g., `job_123.json`).
- `default.json`: Fallback response if specific job file is missing.

## 4. Endpoint Logic Changes

### `GET /api/v1/jobs/scheduling-lineage/`
- **Logic**:
    1. Determine filename based on `query_params.scheduling_type` (e.g., `SELF-TYPE` -> `SELF-TYPE.json`).
    2. Read file `app/data/lineage/{type}.json`.
    3. Parse JSON and apply offset/limit pagination.
    4. Return response.

### `POST /api/v1/jobs/scheduling-lineage/by_ids`
- **Logic**:
    1. Load *all* JSON files from `app/data/lineage/`.
    2. Merge into a single list (in-memory cache could be used, but for dummy app, reading on demand is acceptable/safer for hot-swap).
    3. Filter list by requested `job_id`s.
    4. Return matches.

### `GET /job/{job_id}/run-history` (and legacy endpoint)
- **Logic**:
    1. Construct path `app/data/run-history/{job_id}.json`.
    2. If file exists, return content.
    3. Else, return content of `app/data/run-history/default.json`.

## 5. Implementation Plan
1.  **Data Migration**: Create the `app/data` directories and split the existing `dummy_lineage.json` into the new structure. Generate a sample `default.json` for history.
2.  **Code Update**: Modify `dummy_job_manager.py` to implement the file-reading logic.
3.  **Cleanup**: Remove `data_generator.py` dependency for runtime (it can stay as a utility).

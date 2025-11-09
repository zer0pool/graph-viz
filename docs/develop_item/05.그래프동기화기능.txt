

05.그래프 동기화 기느 설계 

05. Graph Sync Feature - Design

Goal
- Define how to synchronize the graph from external metadata sources or job manager.

Scope
- Identify source-of-truth for jobs/tables
- Define sync triggers (manual API, scheduled job, webhook)
- Map incoming metadata → internal repositories
- Upsert jobs, tables, job-table links, edges, and closures
- Handle deletions/renames (soft delete vs hard delete)
- Emit cache invalidations for Graph Query cache (e.g., Redis)

High-level Flow
0) Whenever job is changed.. Job Manager Service will publish JOB_CHANGE_EVENT.
JOB_CHANGE_EVENT containes job_id 

1) Graph reeives the event and Fetch job metadata from source (Job Manager API, files, etc.)
2) Transform to JobRegister schema
2-1) Extract JobRegister schema from Graph DB. and compare them. 
2-2) If JobRegister schema are same. There is nothing to update. so. ends this process. 

.. and If JobRegister schema are different, then update begins. 
3) For each job:
   - get_or_create job
   - get_or_create reference tables and destination table
   - create job-table links and graph edges
   - expand closures for transitive relationships
4) On success, refresh related cache keys

API Ideas
- POST /api/v1/graph/sync/job/{job_id} (body: source, range/options)
- GET /api/v1/graph/sync/status

Observability
- Return stats: created/updated counts, deletions, errors
- Store last sync timestamp and source details


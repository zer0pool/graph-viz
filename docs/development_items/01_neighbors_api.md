Title: Neighbors API

Summary
- Implements neighbors queries around a job or table up to N hops.

Endpoints
- `GET /api/v1/graph/job/{job_id}/neighbors?level=1`
- `GET /api/v1/graph/table/{table_name}/neighbors?level=1`

Response
- Returns `base_job` or `base_table`, and `nodes`/`edges` suitable for graph rendering.

Notes
- Traverses job↔table edges bidirectionally up to `level`.
- Future work (02) moves logic into GraphQueryService with Redis caching.


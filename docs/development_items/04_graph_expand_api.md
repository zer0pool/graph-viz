Title: Graph Expand API

Summary
- Adds a generic expansion API to grow the current graph around a selected node.

Endpoint
- `GET /api/v1/graph/expand?node_type=job&node_id=...&direction=both&depth=1&limit=100`
- Or: `node_type=table&table_name=...`

Parameters
- `node_type`: `job` | `table`
- `node_id`: job_id (when node_type=job)
- `table_name`: full table name (when node_type=table)
- `direction`: `upstream` | `downstream` | `both`
- `depth`: hops (default 1)
- `limit`: optional cap on edges added

Behavior
- Uses neighbors traversal with direction and limit filters.
- Returns nodes/edges to merge client-side.


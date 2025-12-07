04. Graph Expand Feature

User Scenario & UX
- User clicks a node (job/table) in the rendered subgraph.
- If expandable neighbors exist, show "Expand Graph" in context menu.

Options
- Direction: Upstream, Downstream, Both
- Depth: 1 (default) or 2–3
- Limit: max edges/nodes (e.g., 100)
- Filters: job_status, project/dataset, edge.is_active, trigger_on_only, etc.

Behavior
- Query neighbors centered on selected node (SQL/ClosureTable).
- Merge the result into current graph.
- Animate new nodes/edges (spring-out, fade-in, thickness easing).
- Partial layout around selected node; avoid full graph re-layout.
- Provide loading indicator and a toast: "+N nodes, +M edges (0.24s)" with undo.

QA checklist
- Merge correctness for duplicate nodes/edges
- Direction/depth/filter combinations correctness
- Counts/stats after permission filters
- Performance on large expansions
- Undo/redo (increment rollback)
- API timeout/limit/cursor behaviors


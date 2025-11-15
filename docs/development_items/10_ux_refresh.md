Title: Graph Manager UX Refresh (10)

Summary
- Aligns the SPA layout with the UX spec (GitHub-style top nav, persistent left info panel, toolbar/filter bar).
- Adds richer node context (metadata, upstream/downstream previews, trigger table card) and contextual actions.
- Improves graph usability with filter controls, selection/highlight animation, and better status feedback.

Key UI Changes
- `src/graph_manager/static/index.html`
  - Rebuilt the shell into three regions: top nav, left info panel, main graph area.
  - Added nav tabs, enhanced search bar, user chip reuse, and toolbar/filter controls (type/status/depth).
  - Introduced info panel sections (metadata, relations, trigger jobs, action grid).
- `src/graph_manager/static/css/modern-console.css`
  - New layout rules for nav tabs, info panel, filter bar, graph toolbar, and floating controls.
  - Styled relation lists, metadata grid, action buttons, and polished zoom/toolbar buttons.

Interaction & Graph Logic
- `src/graph_manager/static/js/main.js`
  - Global filter state (type/status/depth) + listeners; depth selection now affects `/neighbors` queries.
  - Added info-panel state, relation tracking, trigger section rendering, and contextual action handlers (focus/expand/layout/clear).
  - Selection/hover logic dims unrelated nodes, highlights connected edges, and animates selection (width/height/shadow).
  - Added helper overlays: status badge, relation “more” viewer, pulse animation for search hits, show/hide trigger data.
  - All API calls go through `authClient.fetchWithAuth`; graph status indicator shows load/fail states.
  - SSE stream now reattaches on auth change; filters reapplied after layout/expansion.
- `src/graph_manager/static/js/auth.js`
  - (unchanged aside from earlier work) continues to drive fetchWithAuth/session state leveraged by the new UI.

Testing / Notes
- Manual verification: search for a job/table, confirm graph renders, select nodes to watch info panel + highlight.
- Depth filter updates backend query level; type/status filters fade nodes client-side.
- Trigger jobs section only appears for table nodes and keeps existing toggle/bulk-off interactions.

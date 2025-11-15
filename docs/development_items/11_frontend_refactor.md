Title: Frontend Modularization & Clean Architecture (11)

Summary
- Breaks the monolithic `static/js/main.js` into cohesive modules (services, state, UI, graph) for maintainability.
- Introduces an orchestrating bootstrap (`app/main.js`) that wires ApiClient, GraphController, ControlBar, and EventService following a simple mediator pattern.
- Preserves existing UX (search, filters, info panel, graph interactions, triggers, SSE/polling) while making responsibilities explicit and testable.

New Structure
```
static/js/app/
  config.js              # constants/selectors + poll interval reader
  state.js               # SearchState, FilterState, RelationState, SelectionState
  main.js                # entrypoint; composes all controllers
  services/
    api.js               # auth-aware fetch wrapper + graph/table helpers
    events.js            # SSE replay + polling guard (reuses api client)
  graph/
    styles.js            # Cytoscape stylesheet definition
    graph.js             # GraphController (init, selection, filters, expansion)
  ui/
    panel.js             # PanelController (metadata, relations, trigger table, status)
    controls.js          # ControlBar (search autocomplete, filters, action buttons)
```

Key Improvements
- **ApiClient** centralises authenticated fetches and domain-specific helpers (neighbors, expand, triggers, state hash).
- **PanelController** encapsulates DOM updates for metadata, upstream/downstream previews, trigger toggles, and status indicators.
- **GraphController** owns Cytoscape lifecycle, styling, selection/highlight logic, manual expansion, and filter application.
- **ControlBar** handles search suggestions, filter dropdowns, reset/expand/focus actions, and delegates to ApiClient + GraphController.
- **EventService** (ported from legacy logic) now exposes `start/stop`, stores last event ID, reconnects SSE with replay, and replays last search when polling detects divergence.

Runtime Flow
1. `app/main.js` waits for `authReady`, instantiates all controllers, and initializes the graph canvas.
2. ControlBar binds DOM events; search submissions fetch neighbors through ApiClient and feed them into GraphController.
3. GraphController renders nodes/edges, applies filters, and notifies PanelController whenever selection changes.
4. PanelController fetches trigger data per table node and exposes quick actions (relation popovers, status badges).
5. EventService keeps UI fresh via SSE + polling; it reuses ApiClient for `/state-hash` and calls GraphController to rerender the last query if needed.
6. Layout/zoom/minimap controls remain wired through GraphController’s helper, mirroring the previous UX.

Usage Notes
- HTML now loads `auth.js` followed by `<script type="module" src="/static/js/app/main.js"></script>`.
- CSS gained utility classes (`.trigger-head`, `.trigger-row`, etc.) to support the new panel markup.
- Existing action buttons (`Focus node`, `Expand ↑/↓/both`, `Clear`, etc.) are wired via ControlBar, making it easy to add more commands later.

Title: Frontend Button → Behavior Map

Context
- Source files: `static/index.html`, `static/js/app/ui/controls.js`, `static/js/app/graph/graph.js`, `static/js/app/ui/panel.js`.
- Most buttons delegate to `ControlBar`, which then calls methods on `GraphController`/`PanelController`.

Button Reference

| UI Label / Control | DOM Reference | JS Handler | Expected Behavior |
|--------------------|---------------|------------|-------------------|
| Search input typing | `#jobId` | `ControlBar.bindSearchInput` → `api.fetchSuggestions` | Debounced autocomplete query → renders `Jobs/Tables` candidate list under the field. Requires backend `/api/v1/search/suggest`. |
| Search button | `#loadBtn` | `ControlBar.submitSearch` → `api.fetchNeighbors` → `GraphController.renderGraph` | Fetches neighbors for the selected query (`job` or `table`), redraws graph + info panel. |
| Suggestions list items | `.suggestions .item` | click handler in `renderSuggestions` | Sets `selectedType/Value`, populates search box, closes suggestions, ready for `Search`. |
| Type filter | `#type-filter` | `ControlBar.bindFilters` → `GraphController.applyFilters` | Hides nodes that don’t match (adds `filtered-out` class). |
| Status filter | `#status-filter` | same as above | Filter nodes by `data('status')`. |
| Depth filter | `#depth-filter` | `bindFilters` | Updates `filterState.depth`; affects future expand/search depth. |
| Reset graph | `#reset-graph` | `ControlBar.bindReset` | Clears node selection, fits/centers Cytoscape. |
| Focus node | `#action-focus` | `bindActions` | Animates viewport to currently selected node. |
| Expand ↑ / ↓ | `#action-expand-up`, `#action-expand-down` | `GraphController.expand(direction)` via ControlBar | Calls `/api/v1/graph/expand` and merges upstream/downstream nodes around selection. |
| Expand both | `#action-expand-both` | same | Expand both directions. |
| Layout | `#layout-reset` | re-run `cy.layout({ name: 'dagre', ... })` | Recomputes layout keeping current nodes. |
| Highlight path | `#highlight-path` | `GraphController.highlightNeighborhood` | Dims other nodes, highlights selection neighborhood. |
| Clear selection | `#clear-selection` | `GraphController.clearSelection` | Removes selection/overlays, resets panel placeholder. |
| Zoom + / - / reset | `#zoom-in`, `#zoom-out`, `#zoom-reset`, `#reset-view` | `GraphController.bindZoomControls` | Adjust Cytoscape zoom / fit. |
| Minimap toggle | `#minimap-toggle` | same | Show/hide minimap overlay. |
| Trigger toggles | `.trigger-toggle` (per row) | `PanelController.bindTriggerEvents` | PATCH single trigger on/off (requires auth unless disabled). |
| Trigger “All OFF” | `#bulk-off` | `PanelController.bindTriggerEvents` | Bulk disable triggers for selected table. |
| Context menu Expand/Sync buttons | `#ctx-expand`, `#ctx-sync` (HTML overlay) | `static/js/app/graph/graph.js` (TODO: not yet re-wired after refactor; currently inactive) | Needs implementation. |

Notes
- Context-menu related buttons (`ctx-expand`, `ctx-sync`, direction/depth controls) still rely on the legacy overlay; after refactor they are not wired. Add follow-up task if we want them active.
- Action buttons assume a node is selected; otherwise they no-op.

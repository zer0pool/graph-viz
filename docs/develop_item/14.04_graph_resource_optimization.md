Title: 04. Graph Resource Optimization

Summary
- Measure render/interaction cost via Chrome DevTools Performance view before/after each change.
- Remove expensive node styles (shadows, multiple backgrounds) and use minimal color changes for hover/selection.
- Avoid running automatic layouts while dragging; only trigger dagre when Flow buttons are clicked or when new data arrives.
- Add `performance.now()` instrumentation around layout/expand to log timings.
- Use Paint flashing / FPS meter to verify improvements.

Action Items
1. Setup Performance panel workflow (record + compare). Document baseline numbers.
2. Add developer HUD logging layout time, drag handler cost.
3. Simplify Cytoscape styles (turn off `shadow-*`, reduce transitions).
4. Reuse nodes instead of recreating cytoscape instance (keeps GPU resources).
5. Test with deep graphs and log time savings.

## 2025-11-16 Progress
- Refactored `GraphController.renderGraph()` to reuse the single Cytoscape instance instead of destroying/recreating it on every response, which avoids re-registering listeners and reduces layout thrash.
- Cached viewport/positions survive full re-renders; dagre runs only when explicitly requested, or when a search asks for a fresh horizontal layout via `forceLayoutDirection`.
- Search submissions now call `renderGraph(..., resetViewport: true, forceLayoutDirection: "horizontal")` so new results always open in the canonical left→right DAG layout while still benefiting from the new reuse model on subsequent refreshes.
- Empty graph responses now short-circuit after clearing caches so idle polling no longer triggers needless layout work.
- Re-skinned table nodes to the BigQuery-style cards (two-line label with dataset + left icon), added explicit [+]/BigQuery glyphs and square orange “process” tiles, switched the canvas to a dot-grid, curved edges, and tightened dagre spacing so the graph closely mirrors the BigQuery lineage layout.
- Restored the `.env` parser guard for `REQUIRE_AUTHENTICATION`, so inline comments like `false # dev` are stripped before casting—prevents the frontend autocomplete from being blocked by unintended auth requirements.
- Hardened the search box event binding: listeners now reattach via a MutationObserver so even if the navbar is re-rendered during UI tweaks, the autocomplete and Search button wiring stay alive.
- Fixed Cytoscape warnings by removing unsupported style keys (`border-radius`, CSS cursor) and by expressing multi-layer icon backgrounds as arrays; table cards now show the [+] handle, dataset badge, and label in the requested order. Job nodes temporarily fall back to a simple “JOB” label pill so we can iterate without the icon-scaling glitch. Edges ultimately settled on `curve-style: unbundled-bezier` with `edge-distances: endpoints` plus angular endpoints and manual control-point offsets so every line exits from the card midpoints and still gets the BigQuery-style bow, while node-to-node vertical spacing was halved for tighter stacking. Upgraded Cytoscape.js to v3.33.1 so we pick up the latest renderer fixes and curve-handling improvements.

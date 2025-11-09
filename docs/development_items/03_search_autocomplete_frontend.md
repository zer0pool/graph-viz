Title: Search Autocomplete (Frontend)

Summary
- Adds autocomplete UI and graph rendering behavior to the bundled frontend under `src/graph_manager/static/`.

Changes
- `static/index.html`: search input now shows suggestions dropdown; button now labeled "Search".
- `static/css/modern-console.css`: styles for suggestions dropdown (group headers, items, badges).
- `static/js/main.js`: rewritten to
  - Query `GET /api/v1/search/suggest?q=...` with debounce
  - Render suggestions (jobs and tables)
  - On selection or manual input, call neighbors API (job/table) and render Cytoscape graph

Usage
- Type at least 1 char; pick from suggestions, or click Search.
- Heuristics: inputs containing `.` are treated as tables; others as jobs if no suggestion is selected.
- Graph renders nodes/edges from neighbors response; tables get a distinct style.


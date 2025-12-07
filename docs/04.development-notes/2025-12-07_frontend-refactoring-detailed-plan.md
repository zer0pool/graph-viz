# Frontend Refactoring Detailed Plan (v1.0)

## Executive Summary

Current state: monolithic frontend with God Objects (GraphController 799 lines, complex interdependencies, unclear responsibilities)
Target state: modular, testable architecture with single-responsibility modules

### Current Problems
1. **GraphController** (799 lines): Contains Cytoscape init, rendering, events, selections, filtering, persistence, list view
2. **PanelController** (747 lines): Mixes job details, table details, timeliness, triggers, lineage
3. **main.js**: Handles auth, DI, layout setup, event binding (247 lines)
4. **ApiClient**: Single monolithic client without domain separation
5. **Circular dependencies**: UI ↔ Graph ↔ Panel ↔ Events
6. **No clear data flow**: State mutations scattered across modules

### Expected Benefits
- ✅ Each module < 200 lines (except orchestrators)
- ✅ Clear public APIs and single responsibilities
- ✅ Testable units
- ✅ Easier to add features (new detail views, filters, etc.)
- ✅ Frontend maintainability improves drastically

---

## Phase 1: Planning & Core Infrastructure (3-4 hours)

### Task 1.1: Create Core Utilities (1 hour)

**Create `src/lineage_manager/static/js/core/`** directory with:

#### `core/dom.js` - DOM helpers
```javascript
export function qs(selector, root = document) { return root.querySelector(selector); }
export function qsa(selector, root = document) { return root.querySelectorAll(selector); }
export function on(el, event, handler) { el?.addEventListener(event, handler); }
export function off(el, event, handler) { el?.removeEventListener(event, handler); }
export function addClass(el, cls) { el?.classList.add(cls); }
export function removeClass(el, cls) { el?.classList.remove(cls); }
export function toggleClass(el, cls) { el?.classList.toggle(cls); }
export function hasClass(el, cls) { return el?.classList.contains(cls); }
export function setAttr(el, attr, val) { el?.setAttribute(attr, val); }
export function getAttr(el, attr) { return el?.getAttribute(attr); }
export function setData(el, key, val) { el.dataset[key] = val; }
export function getData(el, key) { return el.dataset[key]; }
export function setText(el, text) { if (el) el.textContent = text; }
export function setHTML(el, html) { if (el) el.innerHTML = html; }
export function show(el) { el?.classList.remove("hidden"); }
export function hide(el) { el?.classList.add("hidden"); }
export function togglePanel(panel, button, open) {
  if (!panel || !button) return;
  panel.classList.toggle("collapsed", !open);
  button.setAttribute("aria-expanded", open ? "true" : "false");
}
```

#### `core/eventBus.js` - Pub/sub pattern
```javascript
export class EventBus {
  constructor() { this.events = {}; }
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
  }
  off(event, handler) {
    if (this.events[event]) this.events[event] = this.events[event].filter(h => h !== handler);
  }
  emit(event, data) {
    this.events[event]?.forEach(h => h(data));
  }
}
```

#### `core/layoutShell.js` - Layout orchestrator
```javascript
export class LayoutShell {
  constructor() {
    this.controlPanel = qs("#control-panel");
    this.detailPanel = qs("#detail-panel");
    this.controlToggle = qs("#control-toggle");
    this.detailToggle = qs("#detail-toggle");
  }
  
  init() {
    this.setupToggles();
  }
  
  setupToggles() {
    // Move all panel toggle logic from main.js here
  }
  
  showDetailPanel() { show(this.detailPanel); }
  hideDetailPanel() { hide(this.detailPanel); }
  toggleDetailPanel() { toggleClass(this.detailPanel, "collapsed"); }
}
```

**Decision Point**: Are these helpers sufficient, or add tiny utility library?

### Task 1.2: Create Detailed Refactoring Roadmap (30 min)

**File: `docs/frontend_refactoring_roadmap.md`**

Break down each phase with:
- Specific files to modify
- New files to create
- Old files to retire
- Testing checklist per phase
- Rollback strategy (keep old code until Phase verified)

### Task 1.3: Backup Current Code (30 min)

```bash
git checkout -b 19.front_refactoring_wip
mkdir -p src/lineage_manager/static/js/.backup
cp -r src/lineage_manager/static/js/app/* src/lineage_manager/static/js/.backup/
```

---

## Phase 2: API Layer Reorganization (2-3 hours)

### Task 2.1: Separate API Clients by Domain

**Current**: `services/api.js` (104 lines, mixed concerns)
**Target**: Split into focused clients

```
static/js/api/
  ├── base.js          # BaseApiClient (fetch wrapper)
  ├── graph.js         # GraphApi (neighbors, DAG, expand)
  ├── job.js           # JobApi (detail, runs history)
  ├── table.js         # TableApi (metadata, schema, storage)
  ├── timeliness.js    # TimelinessApi (daily/hourly charts)
  ├── triggers.js      # TriggersApi (get/set table triggers)
  ├── search.js        # SearchApi (suggestions)
  └── index.js         # Export factory
```

**Key change**: Each API has single responsibility
```javascript
// api/graph.js
export class GraphApi {
  constructor(base) { this.base = base; }
  neighbors(kind, value, depth) { ... }
  expand(params) { ... }
  dag(tableName, options) { ... }
}

// api/job.js
export class JobApi {
  constructor(base) { this.base = base; }
  getDetail(jobId) { ... }
  getRunsHistory(jobId, limit) { ... }
  getDependencies(jobId) { ... }
}
```

### Task 2.2: Create API Factory

**File: `static/js/api/index.js`**

```javascript
import { GraphApi } from "./graph.js";
import { JobApi } from "./job.js";
import { TableApi } from "./table.js";
// ... etc

export function createApiClients(authClient) {
  const base = new BaseApiClient(authClient);
  return {
    graph: new GraphApi(base),
    job: new JobApi(base),
    table: new TableApi(base),
    timeliness: new TimelinessApi(base),
    triggers: new TriggersApi(base),
    search: new SearchApi(base),
  };
}
```

**Dependency**: None; this is foundation for other phases

---

## Phase 3: Graph Module Refactoring (4-5 hours) - **CRITICAL**

### Task 3.1: Separate Graph View from Logic

Currently `graph/graph.js` (799 lines) handles: Cytoscape init, rendering, events, selection, filtering, persistence, list view

**Target split**:
```
static/js/graph/
  ├── graphView.js        # Cytoscape init + render only
  ├── graphController.js  # Orchestrator: state + events
  ├── graphSelection.js   # Node selection logic
  ├── graphFiltering.js   # Apply filters to graph
  ├── graphPersistence.js # Position/viewport caching
  ├── graphExpansion.js   # Expand neighbors
  ├── graphListView.js    # List/table view rendering
  └── styles.js          # (unchanged)
```

### Task 3.2: Create `graphView.js` (Pure Cytoscape wrapper)

```javascript
// graph/graphView.js
export class GraphView {
  constructor(container) {
    this.cy = cytoscape({
      container,
      layout: { name: "concentric", minNodeSpacing: 120 },
      minZoom: 0.5, maxZoom: 2.0,
      style: getGraphStyles(),
      // ... other options
    });
  }

  renderGraph(elements) {
    this.cy.elements().remove();
    this.cy.add(elements);
  }

  getNode(id) { return this.cy.getElementById(id); }
  getNodes() { return this.cy.nodes(); }
  getEdges() { return this.cy.edges(); }
  
  layout(layoutName, options) {
    return this.cy.layout({ name: layoutName, ...options }).run();
  }
  
  zoom(z) { this.cy.zoom(z); }
  pan(pos) { this.cy.pan(pos); }
  
  destroy() { this.cy.destroy(); }
}
```

### Task 3.3: Extract `graphSelection.js`

```javascript
// graph/graphSelection.js
export class GraphSelection {
  constructor(graphView, eventBus) {
    this.view = graphView;
    this.bus = eventBus;
    this.selectedNode = null;
  }
  
  selectNode(node) {
    this.clearSelection();
    this.selectedNode = node;
    node.addClass("selected");
    this.bus.emit("graph:nodeSelected", { node });
  }
  
  clearSelection() {
    if (this.selectedNode) this.selectedNode.removeClass("selected");
    this.selectedNode = null;
  }
  
  getSelectedNode() { return this.selectedNode; }
  
  highlightNeighborhood(node) {
    // ... neighborhood highlight logic
  }
}
```

### Task 3.4: Extract `graphPersistence.js`

```javascript
// graph/graphPersistence.js
export class GraphPersistence {
  constructor(graphView) { this.view = graphView; }
  
  savePositions() {
    const positions = new Map();
    this.view.getNodes().forEach(node => {
      positions.set(node.id(), node.position());
    });
    sessionStorage.setItem("graphPositions", JSON.stringify(Array.from(positions)));
  }
  
  restorePositions() {
    const data = sessionStorage.getItem("graphPositions");
    if (!data) return;
    const positions = new Map(JSON.parse(data));
    this.view.getNodes().forEach(node => {
      if (positions.has(node.id())) node.position(positions.get(node.id()));
    });
  }
  
  saveViewport() {
    sessionStorage.setItem("graphViewport", JSON.stringify({
      zoom: this.view.cy.zoom(),
      pan: this.view.cy.pan()
    }));
  }
  
  restoreViewport() {
    const data = sessionStorage.getItem("graphViewport");
    if (!data) return;
    const { zoom, pan } = JSON.parse(data);
    this.view.cy.zoom(zoom);
    this.view.cy.pan(pan);
  }
}
```

### Task 3.5: Extract `graphFiltering.js`

```javascript
// graph/graphFiltering.js
export class GraphFiltering {
  constructor(graphView) { this.view = graphView; }
  
  applyFilters(filterState) {
    const allNodes = this.view.getNodes();
    allNodes.forEach(node => {
      const matches = this.matchesFilter(node, filterState);
      if (matches) node.show();
      else node.hide();
    });
  }
  
  matchesFilter(node, filterState) {
    // Apply layer, type, status filters
    return true; // or false
  }
}
```

### Task 3.6: Refactor `graphController.js` (Orchestrator)

```javascript
// graph/graphController.js (NEW - orchestrator only)
export class GraphController {
  constructor({ api, eventBus, layoutShell, panel, filterState, selectionState }) {
    this.api = api;
    this.bus = eventBus;
    this.layout = layoutShell;
    this.panel = panel;
    this.filterState = filterState;
    this.selectionState = selectionState;
    
    // Delegate instances
    this.view = null;
    this.selection = null;
    this.persistence = null;
    this.filtering = null;
  }
  
  async init(container) {
    this.view = new GraphView(container);
    this.selection = new GraphSelection(this.view, this.bus);
    this.persistence = new GraphPersistence(this.view);
    this.filtering = new GraphFiltering(this.view);
    
    this.bindViewEvents();
    this.bindPanelEvents();
  }
  
  bindViewEvents() {
    this.view.cy.on("tap", "node", (evt) => {
      this.selection.selectNode(evt.target);
      this.panel.showNode(evt.target);
    });
  }
  
  async loadGraph(nodeId) {
    const data = await this.api.graph.neighbors(nodeId);
    this.view.renderGraph(data.elements);
    this.persistence.restoreViewport();
  }
  
  applyFilter(filterState) {
    this.filtering.applyFilters(filterState);
  }
  
  expandNode(nodeId, direction, depth) {
    return this.api.graph.expand({ center: nodeId, direction, depth });
  }
}
```

**Decision point**: Keep old `graph.js` as fallback or retire immediately?

---

## Phase 4: Panel Module Refactoring (3-4 hours)

### Task 4.1: Separate Detail Views

**Current**: `ui/panel.js` (747 lines) + `ui/detailView.js` (mixed)
**Target**:
```
static/js/panels/
  ├── panelController.js     # Orchestrator: show which view
  ├── jobDetailView.js       # Job-only rendering
  ├── tableDetailView.js     # Table-only rendering
  ├── timelinessView.js      # (moved, unchanged)
  └── triggerManager.js      # (extracted from panel)
```

### Task 4.2: Create Pure `jobDetailView.js`

```javascript
// panels/jobDetailView.js
export class JobDetailView {
  constructor(container) {
    this.container = container;
    this.elements = {
      label: qs(".job-label", container),
      // ... other job-specific elements
    };
  }
  
  render(jobData) {
    setText(this.elements.label, jobData.label);
    // ... render job details
  }
  
  clear() {
    setHTML(this.container, "");
  }
}
```

### Task 4.3: Create Pure `tableDetailView.js`

```javascript
// panels/tableDetailView.js
export class TableDetailView {
  constructor(container) {
    this.container = container;
    this.elements = { /* table-specific DOM refs */ };
  }
  
  render(tableData) {
    setText(this.elements.fullName, tableData.full_name);
    // ... render table details
  }
  
  renderSchema(schema) { /* ... */ }
  renderStorage(storage) { /* ... */ }
  clear() { setHTML(this.container, ""); }
}
```

### Task 4.4: Refactor `panelController.js` (Orchestrator)

```javascript
// panels/panelController.js
export class PanelController {
  constructor({ api, layoutShell, timelinessView, triggerManager }) {
    this.api = api;
    this.layout = layoutShell;
    this.timeliness = timelinessView;
    this.triggers = triggerManager;
    
    this.jobView = new JobDetailView(qs(".job-details"));
    this.tableView = new TableDetailView(qs(".table-details"));
    this.currentNode = null;
  }
  
  async showNode(node) {
    this.currentNode = node;
    if (node.data("type") === "job") {
      const jobData = await this.api.job.getDetail(node.id());
      this.jobView.render(jobData);
      this.layout.showTab("job");
    } else if (node.data("type") === "table") {
      const tableData = await this.api.table.getDetail(node.id());
      this.tableView.render(tableData);
      this.layout.showTab("table");
    }
  }
  
  clear() {
    this.jobView.clear();
    this.tableView.clear();
    this.currentNode = null;
  }
}
```

---

## Phase 5: Controls Module Refactoring (2 hours)

### Task 5.1: Separate Controls into Independent Components

**Current**: `ui/controls.js` (mixed search, filter, reset)
**Target**:
```
static/js/controls/
  ├── controlBar.js        # Orchestrator
  ├── searchControl.js     # Search + suggestions
  ├── filterControl.js     # Filter dropdowns
  └── resetControl.js      # Reset button
```

### Task 5.2: Create `searchControl.js`

```javascript
// controls/searchControl.js
export class SearchControl {
  constructor({ api, eventBus }) {
    this.api = api;
    this.bus = eventBus;
    this.input = qs("#jobId");
    this.suggestionsBox = qs("#suggestions");
    this.loadBtn = qs("#loadBtn");
  }
  
  init() {
    on(this.input, "input", (e) => this.handleInput(e.target.value));
    on(this.loadBtn, "click", () => this.handleSearch());
  }
  
  async handleInput(query) {
    if (!query) { hide(this.suggestionsBox); return; }
    const suggestions = await this.api.search.suggest(query);
    this.renderSuggestions(suggestions);
  }
  
  renderSuggestions(suggestions) {
    setHTML(this.suggestionsBox, suggestions.map(s => 
      `<div class="suggestion" data-id="${s.id}">${s.label}</div>`
    ).join(""));
    show(this.suggestionsBox);
  }
  
  handleSearch() {
    const query = this.input.value;
    this.bus.emit("search:query", { query });
  }
}
```

### Task 5.3: Create `filterControl.js`

```javascript
// controls/filterControl.js
export class FilterControl {
  constructor({ eventBus, filterState }) {
    this.bus = eventBus;
    this.state = filterState;
    this.layerSelect = qs("#filter-layer");
    this.typeSelect = qs("#filter-type");
  }
  
  init() {
    on(this.layerSelect, "change", () => this.handleFilterChange());
    on(this.typeSelect, "change", () => this.handleFilterChange());
  }
  
  handleFilterChange() {
    const newState = {
      layer: this.layerSelect.value,
      type: this.typeSelect.value,
    };
    this.state.update(newState);
    this.bus.emit("filter:changed", { filterState: newState });
  }
}
```

### Task 5.4: Refactor `controlBar.js` (Orchestrator)

```javascript
// controls/controlBar.js
export class ControlBar {
  constructor({ api, eventBus, graph, panel, filterState, selectionState }) {
    this.api = api;
    this.bus = eventBus;
    this.graph = graph;
    this.panel = panel;
    
    this.search = new SearchControl({ api, eventBus });
    this.filter = new FilterControl({ eventBus, filterState });
  }
  
  init() {
    this.search.init();
    this.filter.init();
    
    this.bus.on("search:query", (data) => this.handleSearch(data.query));
    this.bus.on("filter:changed", (data) => this.graph.applyFilter(data.filterState));
  }
  
  async handleSearch(query) {
    const result = await this.api.graph.neighbors(query, 1);
    this.graph.renderGraph(result);
  }
}
```

---

## Phase 6: Auth & Layout Shell (1.5 hours)

### Task 6.1: Extract Auth Logic

**File**: Keep `static/js/auth/auth.js` mostly unchanged
**New file**: `static/js/core/layoutShell.js` with panel toggle logic

```javascript
// core/layoutShell.js
export class LayoutShell {
  constructor() {
    this.controlPanel = qs("#control-panel");
    this.detailPanel = qs("#detail-panel");
    this.controlToggle = qs("#control-toggle");
    this.detailToggle = qs("#detail-toggle");
    this.tabs = new Map();
  }
  
  init() {
    this.setupToggles();
    this.setupTabs();
  }
  
  setupToggles() {
    on(this.controlToggle, "click", () => this.togglePanel(this.controlPanel, this.controlToggle));
    on(this.detailToggle, "click", () => this.togglePanel(this.detailPanel, this.detailToggle));
  }
  
  togglePanel(panel, button) {
    const isNowOpen = hasClass(panel, "collapsed");
    toggleClass(panel, "collapsed");
    setAttr(button, "aria-expanded", String(isNowOpen));
  }
  
  showTab(tabName) {
    // Switch between job/table/timeliness tabs
    qsa(".tab-panel").forEach(p => hide(p));
    show(qs(`.tab-panel[data-tab="${tabName}"]`));
  }
}
```

---

## Phase 7: Main.js Refactoring (1.5 hours)

### Task 7.1: Rewrite `app/main.js` as Pure Orchestrator

```javascript
// app/main.js (REFACTORED)
import { LayoutShell } from "../core/layoutShell.js";
import { createApiClients } from "../api/index.js";
import { GraphController } from "../graph/graphController.js";
import { PanelController } from "../panels/panelController.js";
import { ControlBar } from "../controls/controlBar.js";
import { EventService } from "../services/events.js";
import { EventBus } from "../core/eventBus.js";
import { FilterState, SearchState, SelectionState } from "./state.js";

async function bootstrap() {
  await window.authReady;
  
  // Setup infrastructure
  const layout = new LayoutShell();
  layout.init();
  
  const eventBus = new EventBus();
  
  // Create API clients
  const api = createApiClients(window.authClient);
  
  // Create state objects
  const filterState = new FilterState();
  const searchState = new SearchState();
  const selectionState = new SelectionState();
  
  // Create modules (dependency injection)
  const panel = new PanelController({
    api,
    layoutShell: layout,
    timelinessView: new TimelinessView(...),
    triggerManager: new TriggerManager(api, eventBus),
  });
  
  const graph = new GraphController({
    api,
    eventBus,
    layoutShell: layout,
    panel,
    filterState,
    selectionState,
  });
  
  const controls = new ControlBar({
    api,
    eventBus,
    graph,
    panel,
    filterState,
    selectionState,
  });
  
  // Initialize all modules
  graph.init(qs("#cy"));
  controls.init();
  
  // Setup event service if authenticated
  if (window.authClient.requireAuth && window.authClient.isAuthenticated()) {
    const events = new EventService({ api, graph, panel, eventBus });
    events.start();
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
```

**Result**: main.js is now ~50 lines of pure composition

---

## Phase 8: Testing & Validation (2-3 hours)

### Task 8.1: Manual Test Checklist

```
☐ Load app, no console errors
☐ Search for job/table, suggestions work
☐ Click on node, detail panel shows
☐ Tab switching works (job/table/timeliness)
☐ Filter by layer/type works
☐ Expand node in context menu
☐ Panel collapse/expand works
☐ Position/viewport persist on page reload
☐ SSE/polling updates invalidate graph
☐ Triggers on/off work
☐ Zoom controls work
☐ List view toggle works
☐ Logout/login flow works
```

### Task 8.2: Regression Prevention

- Keep old `app/.backup` directory as fallback
- After each phase, run full manual test
- Screenshot critical flows before/after

---

## Phase 9: Documentation (1 hour)

### Task 9.1: Create `docs/frontend-architecture.md`

Content:
- Directory structure
- Module responsibilities and public APIs
- Data flow diagram
- State management patterns
- Event flow
- How to add a new feature (new detail view, new filter, etc.)

---

## Timeline Summary

| Phase | Task | Time |
|-------|------|------|
| 1 | Core infrastructure setup | 3-4h |
| 2 | API layer reorganization | 2-3h |
| 3 | Graph module refactoring | 4-5h |
| 4 | Panel module refactoring | 3-4h |
| 5 | Controls module refactoring | 2h |
| 6 | Layout shell & auth | 1.5h |
| 7 | Main.js orchestrator | 1.5h |
| 8 | Testing & validation | 2-3h |
| 9 | Documentation | 1h |
| **Total** | | **~23 hours** |

### Priority Order
1. **Phase 1** (core) → Phase 2 (API) → **Phase 3** (graph - critical)
2. Then Phase 4 → Phase 5 → Phase 6
3. Finally Phase 7 (main.js) → Phase 8-9 (testing + docs)

### Rollback Strategy
- Keep `.backup` directory until Phase 8 passes all tests
- Git branch `19.front_refactoring_wip` for safe development
- After Phase 8 validation, merge to main refactoring branch

---

## Success Criteria

✅ All original features work identically
✅ No new console errors or warnings
✅ Each module < 250 lines (except orchestrators)
✅ Clear public APIs for each module
✅ Single responsibility per module
✅ State flow is unidirectional
✅ Event dependencies clear and documented
✅ New contributors can understand architecture in < 30 min

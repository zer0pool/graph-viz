cytoscape.use(cytoscapeDagre);

// Global selection state for search
const searchState = {
  selectedType: null, // 'job' | 'table'
  selectedValue: null,
  itemsCount: 0,
  activeIndex: -1,
};

const filterState = {
  type: "all",
  status: "all",
  depth: 1,
};

const panelElements = {
  title: document.getElementById("node-title"),
  subtitle: document.getElementById("node-subtitle"),
  type: document.getElementById("node-type-badge"),
  upstream: document.getElementById("upstream-list"),
  downstream: document.getElementById("downstream-list"),
  upstreamMore: document.getElementById("upstream-more"),
  downstreamMore: document.getElementById("downstream-more"),
  owner: document.getElementById("meta-owner"),
  description: document.getElementById("meta-description"),
  updated: document.getElementById("meta-updated"),
};

const actionButtons = {
  focus: document.getElementById("action-focus"),
  expandUp: document.getElementById("action-expand-up"),
  expandDown: document.getElementById("action-expand-down"),
  expandBoth: document.getElementById("action-expand-both"),
  layout: document.getElementById("layout-reset"),
  clearSelection: document.getElementById("clear-selection"),
  highlight: document.getElementById("highlight-path"),
  resetGraph: document.getElementById("reset-graph"),
};

const filterControls = {
  type: document.getElementById("type-filter"),
  status: document.getElementById("status-filter"),
  depth: document.getElementById("depth-filter"),
};

const relationState = {
  upstream: [],
  downstream: [],
};

const apiFetch = (...args) => window.authClient.fetchWithAuth(...args);
let triggerStream = null;
let selectedCyNode = null;

function handleAuthError(err) {
  if (!err) return false;
  if (err.message === "AUTH_REQUIRED" || err.message === "AUTH_EXPIRED") {
    alert("Please sign in to continue.");
    return true;
  }
  return false;
}

function setPanelPlaceholder() {
  panelElements.title.textContent = "그래프를 검색하세요";
  panelElements.subtitle.textContent = "노드를 선택하면 상세 정보가 표시됩니다.";
  panelElements.type.textContent = "No node";
  panelElements.type.classList.add("muted");
  ["upstream", "downstream"].forEach((key) => {
    const list = panelElements[key];
    list.innerHTML = "<li>노드를 선택하세요.</li>";
    list.classList.add("empty");
  });
  panelElements.upstreamMore.hidden = true;
  panelElements.downstreamMore.hidden = true;
  panelElements.owner.textContent = "-";
  panelElements.description.textContent = "-";
  panelElements.updated.textContent = "-";
  relationState.upstream = [];
  relationState.downstream = [];
  const triggerSection = document.getElementById("trigger-section");
  const triggerContainer = document.getElementById("node-triggers");
  if (triggerSection) triggerSection.hidden = true;
  if (triggerContainer) triggerContainer.innerHTML = "";
}

setPanelPlaceholder();

function showRelation(kind) {
  const items = relationState[kind] || [];
  if (!items.length) return;
  alert(items.join("\n"));
}

panelElements.upstreamMore?.addEventListener("click", () => showRelation("upstream"));
panelElements.downstreamMore?.addEventListener("click", () => showRelation("downstream"));

function buildList(listEl, items, moreButton) {
  const limit = 5;
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = "<li>연결된 노드가 없습니다.</li>";
    listEl.classList.add("empty");
    moreButton.hidden = true;
    return;
  }
  listEl.classList.remove("empty");
  items.slice(0, limit).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    listEl.appendChild(li);
  });
  const remaining = items.length - limit;
  if (remaining > 0) {
    moreButton.hidden = false;
    moreButton.textContent = `+${remaining} more`;
  } else {
    moreButton.hidden = true;
  }
}

function updateMetadataFields(data) {
  panelElements.owner.textContent = data.owner || "Unassigned";
  panelElements.description.textContent = data.description || "-";
  panelElements.updated.textContent = data.updated_at || data.updated || "-";
}

function updateInfoPanel(node) {
  if (!node) {
    setPanelPlaceholder();
    return;
  }
  const type = node.data("type") || "job";
  panelElements.title.textContent = node.data("label") || node.id();
  const secondary = type === "table" ? node.data("full_name") : node.data("job_id") || node.id();
  panelElements.subtitle.textContent = secondary || "";
  panelElements.type.textContent = type;
  panelElements.type.classList.toggle("muted", false);

  const incoming = node.incomers("node").map((x) => x.data("label"));
  const outgoing = node.outgoers("node").map((x) => x.data("label"));
  relationState.upstream = incoming;
  relationState.downstream = outgoing;
  buildList(panelElements.upstream, incoming, panelElements.upstreamMore);
  buildList(panelElements.downstream, outgoing, panelElements.downstreamMore);
  updateMetadataFields({
    owner: node.data("owner"),
    description: node.data("description"),
    updated_at: node.data("updated_at") || node.data("updated"),
  });
}

function dimGraphExcept(target) {
  if (!window.cy) return;
  const cy = window.cy;
  cy.nodes().removeClass("selected connected dimmed pulse");
  cy.edges().removeClass("highlighted dimmed");
  if (!target) {
    return;
  }
  cy.batch(() => {
    cy.nodes().addClass("dimmed");
    cy.edges().addClass("dimmed");
    target.removeClass("dimmed").addClass("selected");
    target.connectedEdges().removeClass("dimmed").addClass("highlighted");
    target.connectedNodes().removeClass("dimmed").addClass("connected");
  });
}

function selectNode(node) {
  selectedCyNode = node || null;
  dimGraphExcept(node);
  updateInfoPanel(node);
}

function clearSelection() {
  selectedCyNode = null;
  if (window.cy) {
    window.cy.nodes().removeClass("selected connected dimmed pulse");
    window.cy.edges().removeClass("highlighted dimmed");
  }
  setPanelPlaceholder();
}

function pulseNode(node) {
  if (!node) return;
  node.addClass("pulse");
  setTimeout(() => node.removeClass("pulse"), 600);
}

function showGraphStatus(message, visible = true) {
  const el = document.getElementById("graph-status");
  const textEl = document.getElementById("graph-status-text");
  if (!el || !textEl) return;
  textEl.textContent = message;
  el.hidden = !visible;
}

function applyFilters() {
  if (!window.cy) return;
  const cy = window.cy;
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const nodeType = (node.data("type") || "").toLowerCase();
      const status = (node.data("status") || "unknown").toLowerCase();
      const typePass = filterState.type === "all" || nodeType === filterState.type;
      const statusPass = filterState.status === "all" || status === filterState.status;
      if (typePass && statusPass) {
        node.removeClass("filtered-out");
      } else {
        node.addClass("filtered-out");
      }
    });
  });
}

function handleTriggerUpdate(event) {
  try {
    const data = JSON.parse(event.data || "{}");
    if (!data.job_id) return;
    const toggles = document.querySelectorAll(`.trigger-toggle[data-job="${data.job_id}"]`);
    toggles.forEach((el) => {
      el.checked = !!data.new_state;
      const slider = el.nextElementSibling;
      if (slider && !slider.classList.contains("slider")) {
        slider.className = "slider";
      }
    });
  } catch (_) {
    // ignore malformed events
  }
}

function closeTriggerStream() {
  if (triggerStream) {
    triggerStream.close();
    triggerStream = null;
  }
}

function attachTriggerStream() {
  closeTriggerStream();
  if (!window.authClient || !window.authClient.isAuthenticated()) return;
  const token = window.authClient.getIdToken();
  if (!token) return;
  const url = new URL("/api/v1/events/trigger-status", window.location.origin);
  url.searchParams.set("access_token", token);
  try {
    triggerStream = new EventSource(url.toString());
    triggerStream.addEventListener("trigger_update", handleTriggerUpdate);
    triggerStream.onerror = () => {
      closeTriggerStream();
    };
  } catch (_) {
    closeTriggerStream();
  }
}

function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function fetchSuggestions(q) {
  const res = await apiFetch(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
  return res.json();
}

async function fetchNeighbors(kind, value, level = filterState.depth || 1) {
  const base = `/api/v1/graph/${kind}/${encodeURIComponent(value)}/neighbors?level=${level}`;
  const res = await apiFetch(base);
  if (!res.ok) throw new Error(`Neighbors failed: ${res.status}`);
  return res.json();
}

function renderGraph(data) {
  if (window.cy && typeof window.cy.destroy === "function") window.cy.destroy();

  const cy = (window.cy = cytoscape({
    container: document.getElementById("cy"),
    layout: { name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160 },
    minZoom: 0.6,
    maxZoom: 3.0,
    wheelSensitivity: 0.3,
    style: [
      { selector: "node", style: { shape: "round-rectangle", width: 240, height: 64, "background-color": "#fff", "border-width": 2, "border-color": "#cdd9e5", label: "data(label)", color: "#24292f", "text-valign": "center", "text-halign": "center", "font-size": "13px", "font-weight": "600", "text-wrap": "wrap", "text-max-width": "200px", "shadow-blur": 0, "shadow-opacity": 0, "transition-property": "background-color, border-color, border-width, width, height, opacity, shadow-blur, shadow-opacity", "transition-duration": "200ms", "transition-timing-function": "ease-in-out" } },
      { selector: "node[type='table']", style: { shape: "round-rectangle", "background-color": "#eaf2ff", "border-color": "#1e6bd6", "background-image": ["/static/images/rail-blue.svg", "/static/images/icon-bq-table.svg"], "background-fit": ["none", "none"], "background-position-x": [0, 10], "background-position-y": ["50%", "50%"], "background-width": [8, 18], "background-height": ["100%", 18] } },
      { selector: "node[type='job']", style: { shape: "round-rectangle", "background-color": "#ffffff", "border-color": "#1f883d", "background-image": "/static/images/icon-job.svg", "background-fit": "none", "background-position-x": 10, "background-position-y": "50%", "background-width": 18, "background-height": 18 } },
      { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle", "line-color": "#8b949e", "target-arrow-color": "#8b949e", width: 2 } },
      { selector: 'node.selected', style: { 'border-color': '#0969da', 'border-width': 4, 'width': 260, 'height': 72, 'shadow-blur': 18, 'shadow-color': '#0969da', 'shadow-opacity': 0.4, 'shadow-offset-x': 0, 'shadow-offset-y': 0 } },
      { selector: 'node.connected', style: { 'opacity': 0.95 } },
      { selector: 'node.dimmed', style: { 'opacity': 0.25 } },
      { selector: 'node.filtered-out', style: { 'opacity': 0.05 } },
      { selector: 'node.pulse', style: { 'border-color': '#f79009', 'shadow-color': '#f79009', 'shadow-blur': 22, 'shadow-opacity': 0.55 } },
      { selector: 'node.just-added', style: { 'background-color': '#fef3c7', 'border-color': '#f59e0b' } },
      { selector: 'edge.highlighted', style: { 'line-color': '#0969da', 'target-arrow-color': '#0969da', width: 4 } },
      { selector: 'edge.dimmed', style: { 'opacity': 0.2 } },
      { selector: "edge[io='input']", style: { "line-style": "dashed" } },
    ],
  }));

  // Prevent native context menu inside the graph container
  const cyContainer = document.getElementById('cy');
  cyContainer?.addEventListener('contextmenu', (e) => e.preventDefault());

  // Expand chevrons overlay root
  const overlay = document.createElement('div');
  overlay.id = 'expand-overlay';
  cyContainer?.appendChild(overlay);

  const nodes = (data.nodes || []).map((n) => {
    const type = n.type || "job";
    let label = n.label;
    if (type === "table" && label && label.includes(".")) {
      const parts = label.split(".");
      label = parts[parts.length - 1];
    }
    return {
      data: {
        id: n.id,
        label,
        type,
        full_name: n.full_name || n.label || null,
        owner: n.owner || n.metadata?.owner,
        description: n.description || n.metadata?.description,
        status: n.status || n.metadata?.status,
        job_id: n.job_id,
        updated_at: n.updated_at,
      },
    };
  });
  const edges = (data.edges || []).map((e) => ({ data: { id: e.id || `${e.source}_${e.target}`, source: e.source, target: e.target, io: e.io || "" } }));
  cy.add([...nodes, ...edges]);

  clearSelection();
  cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 100, rankSep: 120 }).run();
  cy.minimap({ zoomFactor: 3.0 });

  // Initial view: fit, then scale down to ~1/4 area (half zoom), and center
  if ((nodes.length + edges.length) > 0) {
    cy.fit();
    const target = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * 0.5));
    cy.zoom(target);
    cy.center();
  }

  const ctxMenu = document.getElementById("ctx-menu");
  const ctxDir = document.getElementById("ctx-direction");
  const ctxDepth = document.getElementById("ctx-depth");
  const ctxLimit = document.getElementById("ctx-limit");
  const ctxCancel = document.getElementById("ctx-cancel");
  const ctxExpand = document.getElementById("ctx-expand");
  const ctxSync = document.getElementById("ctx-sync");
  const ctxHint = document.getElementById("ctx-hint");
  let ctxTargetNode = null;

  function clearExpandButtons() {
    overlay.innerHTML = '';
  }

  function placeExpandButtons(n) {
    const bb = n.renderedBoundingBox();
    overlay.innerHTML = '';
    const mk = (cls, x, y) => {
      const d = document.createElement('div');
      d.className = `expander ${cls}`;
      d.style.position = 'absolute';
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.title = cls === 'left' ? 'Expand (upstream)' : 'Expand (downstream)';
      overlay.appendChild(d);
      return d;
    };
    const left = mk('left', bb.x1 - 18, (bb.y1 + bb.y2) / 2 - 12);
    const right = mk('right', bb.x2 + 2, (bb.y1 + bb.y2) / 2 - 12);
    left.onclick = async (e) => { e.stopPropagation(); left.classList.add('spinning'); await expandFrom(n, 'upstream'); left.classList.remove('spinning'); };
    right.onclick = async (e) => { e.stopPropagation(); right.classList.add('spinning'); await expandFrom(n, 'downstream'); right.classList.remove('spinning'); };
  }

  cy.on("mouseover", "node", (evt) => {
    placeExpandButtons(evt.target);
    if (!selectedCyNode) {
      const target = evt.target;
      cy.nodes().addClass("dimmed");
      cy.edges().addClass("dimmed");
      target.removeClass("dimmed").addClass("connected");
      target.connectedEdges().removeClass("dimmed").addClass("highlighted");
      target.connectedNodes().removeClass("dimmed").addClass("connected");
    }
  });

  cy.on("mouseout", "node", () => {
    if (!selectedCyNode) {
      cy.nodes().removeClass("dimmed connected");
      cy.edges().removeClass("dimmed highlighted");
    }
  });

  cy.on("tap", "node", (evt) => {
    const n = evt.target;
    selectNode(n);
    placeExpandButtons(n);
    if ((n.data('type') || '') === 'table') {
      const tableFullName = n.data('full_name') || n.data('label');
      renderTableTriggers(tableFullName);
    } else {
      const triggerSection = document.getElementById("trigger-section");
      if (triggerSection) triggerSection.hidden = true;
    }
  });
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      clearExpandButtons();
      clearSelection();
    }
  });

  // Right-click (context) to open expand menu near cursor
  cy.on("cxttap", "node", (evt) => {
    ctxTargetNode = evt.target;
    // position panel at cursor
    const ev = evt.originalEvent || {};
    const x = (ev.clientX || 20);
    const y = (ev.clientY || 20);
    if (ctxMenu) ctxMenu.hidden = false;
    ctxMenu.style.left = "0"; // container covers full screen
    ctxMenu.style.top = "0";
    const panelEl = ctxMenu.querySelector('.ctx-panel');
    if (panelEl) {
      panelEl.style.position = 'absolute';
      panelEl.style.left = `${x + 4}px`;
      panelEl.style.top = `${y + 4}px`;
    }
    ctxHint.hidden = true;
  });

  // Cancel closes menu
  ctxCancel?.addEventListener('click', () => {
    if (ctxMenu) ctxMenu.hidden = true;
  });
  // Clicking outside closes menu
  ctxMenu?.addEventListener('click', (e) => {
    if (e.target === ctxMenu && ctxMenu) ctxMenu.hidden = true;
  });

  // Expand action
  ctxExpand?.addEventListener('click', async () => {
    if (!ctxTargetNode) return;
    const type = ctxTargetNode.data('type') || 'job';
    const id = ctxTargetNode.id(); // e.g., j123 / t456
    const isJob = type === 'job' || id.startsWith('j');
    const direction = ctxDir.value;
    const depth = parseInt(ctxDepth.value || '1', 10);
    const limitVal = ctxLimit.value ? parseInt(ctxLimit.value, 10) : undefined;
    const params = new URLSearchParams({
      node_type: isJob ? 'job' : 'table',
      direction,
      depth: String(depth),
    });
    // Prefer internal db id for reliability
    const dbid = parseInt(id.slice(1), 10);
    if (!Number.isNaN(dbid)) params.set('node_db_id', String(dbid));
    if (limitVal) params.set('limit', String(limitVal));
    // Fallbacks if db id fails
    if (isJob && !params.has('node_db_id')) params.set('node_id', ctxTargetNode.data('label') || ctxTargetNode.data('id'));
    if (!isJob && !params.has('node_db_id')) params.set('table_name', ctxTargetNode.data('label') || ctxTargetNode.data('id'));

    try {
      const res = await apiFetch(`/api/v1/graph/expand?${params.toString()}`);
      if (!res.ok) throw new Error(`Expand failed: ${res.status}`);
      const payload = await res.json();
      const added = mergeGraph(cy, payload, id, direction);
      ctxHint.textContent = `+${added.nodes} nodes, +${added.edges} edges added`;
      ctxHint.hidden = false;
      // We manually positioned new nodes to avoid overlap; do not run a layout that moves existing nodes
    } catch (e) {
      ctxHint.textContent = String(e);
      ctxHint.hidden = false;
    }
  });

  // Sync action
  ctxSync?.addEventListener('click', async () => {
    if (!ctxTargetNode) return;
    const id = ctxTargetNode.id();
    const isJob = (ctxTargetNode.data('type') || 'job') === 'job' || id.startsWith('j');
    const dbid = parseInt(id.slice(1), 10);
    try {
      await apiFetch('/api/v1/graph/sync/node', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_type: isJob ? 'job' : 'table', node_db_id: dbid })
      });
      // After sync, expand 1 depth to pick up changes
      const params = new URLSearchParams({ node_type: isJob ? 'job' : 'table', node_db_id: String(dbid), direction: 'both', depth: '1' });
      const res = await apiFetch(`/api/v1/graph/expand?${params.toString()}`);
      if (res.ok) {
        const payload = await res.json();
        mergeGraph(cy, payload, id, 'both');
      }
    } catch (_) {}
  });

  // Double-click expand 1 depth both directions
  cy.on('dbltap', 'node', async (evt) => {
    const n = evt.target; const id = n.id();
    const dbid = parseInt(id.slice(1), 10);
    const isJob = (n.data('type') || 'job') === 'job' || id.startsWith('j');
    const params = new URLSearchParams({ node_type: isJob ? 'job' : 'table', node_db_id: String(dbid), direction: 'both', depth: '1' });
    try {
      const res = await apiFetch(`/api/v1/graph/expand?${params.toString()}`);
      if (res.ok) { const payload = await res.json(); mergeGraph(cy, payload, id, 'both'); }
    } catch (_) {}
  });

  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomLevelText = document.getElementById("zoom-level");

  function updateZoomDisplay() {
    if (zoomLevelText) zoomLevelText.textContent = `${Math.round(cy.zoom() * 100)}%`;
  }
  zoomInBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const newZoom = Math.min(cy.zoom() * 1.2, cy.maxZoom());
    cy.zoom(newZoom);
    cy.center();
    updateZoomDisplay();
  });
  zoomOutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const newZoom = Math.max(cy.zoom() * 0.8, cy.minZoom());
    cy.zoom(newZoom);
    cy.center();
    updateZoomDisplay();
  });
  cy.on("zoom", updateZoomDisplay);
  updateZoomDisplay();

  // Toolbar controls
  const resetBtn = document.getElementById('reset-view');
  const zoomResetBtn = document.getElementById('zoom-reset');
  const miniBtn = document.getElementById('minimap-toggle');
  resetBtn?.addEventListener('click', (e) => { e.preventDefault(); cy.fit(); cy.center(); updateZoomDisplay(); });
  zoomResetBtn?.addEventListener('click', (e) => { e.preventDefault(); cy.zoom(1.0); cy.center(); updateZoomDisplay(); });
  miniBtn?.addEventListener('click', (e) => { e.preventDefault(); const mm = document.querySelector('.cy-minimap'); if (mm) { const shown = mm.style.display !== 'none'; mm.style.display = shown ? 'none' : 'block'; } });

  applyFilters();
  showGraphStatus("", false);
}

async function renderTableTriggers(tableName) {
  const section = document.getElementById("trigger-section");
  const container = document.getElementById("node-triggers");
  if (!section || !container) return;
  section.hidden = true;
  container.innerHTML = "Loading…";
  try {
    const res = await apiFetch(`/api/v1/tables/${encodeURIComponent(tableName)}/triggers`);
    if (!res.ok) throw new Error(`Failed to load triggers: ${res.status}`);
    const data = await res.json();
    if (data.status !== 'success') return;
    const rows = (data.jobs || []).map(j => `
      <tr>
        <td>${j.name}</td>
        <td>
          <label class="switch" title="Toggle trigger">
            <input type="checkbox" class="trigger-toggle" data-job="${j.job_id}" ${j.trigger ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </td>
      </tr>
    `).join('');
    const html = `
      <div class="group-header">
        <div class="group-title">Trigger Jobs</div>
        <button class="btn-pill danger" id="bulk-off">⛔ All OFF</button>
      </div>
      <table class="grid-table">
        <thead>
          <tr><th>Job</th><th>Trigger</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="2" class="badge-off">No consumers</td></tr>'}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
    section.hidden = false;
    // Attach toggle handlers (ensure clickable)
    container.querySelectorAll('.trigger-toggle').forEach(el => {
      el.addEventListener('change', async () => {
        const jobId = el.getAttribute('data-job');
        const want = el.checked;
        const ok = window.confirm(`Change trigger for ${jobId} on ${tableName} to ${want ? 'ON' : 'OFF'}?`);
        if (!ok) { el.checked = !want; return; }
        // Text is inside the switch now; nothing extra to update here
        try {
          const res = await apiFetch(`/api/v1/tables/${encodeURIComponent(tableName)}/triggers/${encodeURIComponent(jobId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: want }) });
          if (!res.ok) throw new Error('update failed');
          // Recalculate bulk-off disabled state
          const bulkBtn = container.querySelector('#bulk-off');
          if (bulkBtn) {
            const anyOn = Array.from(container.querySelectorAll('.trigger-toggle')).some(chk => chk.checked);
            bulkBtn.disabled = !anyOn; // disable if nothing to turn off
          }
        } catch (_) {
          el.checked = !want;
          alert('Failed to update trigger');
        }
      });
    });

    // Bulk action: All OFF
    const bulkOff = container.querySelector('#bulk-off');
    // Disable if all items already OFF
    if (bulkOff) {
      const anyOnInit = (data.jobs || []).some(j => !!j.trigger);
      bulkOff.disabled = !anyOnInit;
    }
    bulkOff?.addEventListener('click', async () => {
      const ok = window.confirm(`Turn OFF trigger for all jobs consuming ${tableName}?`);
      if (!ok) return;
      try {
        const res = await apiFetch(`/api/v1/tables/${encodeURIComponent(tableName)}/triggers`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: false }) });
        if (!res.ok) throw new Error('bulk off failed');
        // Update all switches locally
        container.querySelectorAll('.trigger-toggle').forEach(el => { el.checked = false; });
        if (bulkOff) bulkOff.disabled = true;
      } catch (e) {
        alert('Bulk OFF failed');
      }
    });
    // (removed legacy duplicate handler that overwrote slider class)
  } catch (_) {
    // ignore rendering errors
  }
}

function mergeGraph(cy, data, anchorId, direction) {
  const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
  const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
  // Canonical edge key based on endpoints + io (ignore payload ids)
  const existingEdgeKeys = new Set(
    cy.edges().map(e => `${e.data('source')}__${e.data('target')}__${e.data('io') || ''}`)
  );
  let addedNodes = 0;
  let addedEdges = 0;
  const addedNodeIds = [];

  // Add nodes (dedup) and track additions
  (data.nodes || []).forEach(n => {
    const id = n.id;
    if (!existingNodeIds.has(id)) {
      const created = cy.add({ data: { id: n.id, label: n.label, type: n.type || 'job', owner: n.owner, description: n.description, status: n.status, full_name: n.full_name } });
      created.addClass('just-added');
      setTimeout(() => created.removeClass('just-added'), 600);
      addedNodes++;
      existingNodeIds.add(id);
      addedNodeIds.push(id);
    }
  });

  // Add edges (dedup)
  (data.edges || []).forEach(e => {
    const key = `${e.source}__${e.target}__${e.io || ''}`;
    if (existingEdgeKeys.has(key)) return;
    const id = key; // enforce canonical id to avoid dupes from differing payload ids
    if (!existingEdgeIds.has(id)) {
      // Also ensure no existing edge with same endpoints regardless of id
      const anyExisting = cy.$(`edge[source='${e.source}'][target='${e.target}']`).nonempty();
      if (anyExisting) {
        existingEdgeKeys.add(key);
        return;
      }
      cy.add({ data: { id, source: e.source, target: e.target, io: e.io || '' } });
      addedEdges++;
      existingEdgeIds.add(id);
      existingEdgeKeys.add(key);
    }
  });

  // Heuristic non-overlap placement: upstream left, downstream right of anchor
  try {
    if (addedNodeIds.length && anchorId) {
      const anchor = cy.$(`#${anchorId}`);
      if (anchor && anchor.nonempty()) {
        const pos = anchor.position();
        const dx = 320;
        const dy = 120;

        // Determine per-node relation relative to anchor by inspecting edges in payload
        const upstreamSet = new Set();
        const downstreamSet = new Set();
        (data.edges || []).forEach(e => {
          if (e.target === anchorId) upstreamSet.add(e.source);
          if (e.source === anchorId) downstreamSet.add(e.target);
        });

        let leftGroup = [];
        let rightGroup = [];
        if (direction === 'upstream') {
          leftGroup = addedNodeIds.slice();
        } else if (direction === 'downstream') {
          rightGroup = addedNodeIds.slice();
        } else {
          // both: split by real relation when possible
          addedNodeIds.forEach(nid => {
            if (upstreamSet.has(nid)) leftGroup.push(nid);
            else if (downstreamSet.has(nid)) rightGroup.push(nid);
            else rightGroup.push(nid); // default to downstream
          });
        }

        // Position left group
        leftGroup.forEach((nid, i) => {
          const y = pos.y + (i - (leftGroup.length - 1) / 2) * dy;
          const node = cy.$(`#${nid}`);
          if (node.nonempty()) node.position({ x: pos.x - dx, y });
        });
        // Position right group
        rightGroup.forEach((nid, i) => {
          const y = pos.y + (i - (rightGroup.length - 1) / 2) * dy;
          const node = cy.$(`#${nid}`);
          if (node.nonempty()) node.position({ x: pos.x + dx, y });
        });
      }
    }
  } catch (_) {
    // best-effort only
  }

  applyFilters();
  return { nodes: addedNodes, edges: addedEdges };
}

async function expandFrom(node, direction) {
  try {
    const type = node.data('type');
    const level = 1;
    if (type === 'job') {
      const res = await apiFetch(`/api/v1/graph/job/${encodeURIComponent(node.data('label'))}/neighbors?level=${level}&direction=${direction}`);
      if (!res.ok) return;
      const data = await res.json();
      mergeGraph(window.cy, data, node.id(), direction);
    } else {
      const tableName = node.data('full_name') || node.data('label');
      const res = await apiFetch(`/api/v1/graph/table/${encodeURIComponent(tableName)}/neighbors?level=${level}&direction=${direction}`);
      if (!res.ok) return;
      const data = await res.json();
      mergeGraph(window.cy, data, node.id(), direction);
    }
  } catch (e) { /* noop */ }
}

function renderSuggestionsBox(data) {
  const box = document.getElementById("suggestions");
  if (!box) return;
  const jobs = data.jobs || [];
  const tables = data.tables || [];
  if (jobs.length === 0 && tables.length === 0) {
    box.innerHTML = '<div class="group">No results</div>';
    box.hidden = false;
    return;
  }
  let html = "";
  if (jobs.length) {
    html += '<div class="group">Jobs</div>';
    html += jobs
      .map(
        (j) =>
          `<div class=\"item\" data-type=\"job\" data-value=\"${encodeURIComponent(j.job_id)}\"><span class=\"badge\">JOB</span> ${j.name || j.job_id}</div>`
      )
      .join("");
  }
  if (tables.length) {
    html += '<div class="group">Tables</div>';
    html += tables
      .map(
        (t) =>
          `<div class=\"item\" data-type=\"table\" data-value=\"${encodeURIComponent(t.full_name)}\"><span class=\"badge\">TABLE</span> ${t.full_name}</div>`
      )
      .join("");
  }
  box.innerHTML = html;
  box.hidden = false;

  // Attach item click handlers
  const items = Array.from(box.querySelectorAll(".item"));
  searchState.itemsCount = items.length;
  searchState.activeIndex = items.length ? 0 : -1;
  if (items.length) items[0].classList.add("active");
  items.forEach((el, idx) => {
    el.addEventListener("mouseenter", () => {
      items.forEach((i) => i.classList.remove("active"));
      el.classList.add("active");
      searchState.activeIndex = idx;
    });
    el.addEventListener("click", () => {
      const type = el.getAttribute("data-type");
      const value = decodeURIComponent(el.getAttribute("data-value") || "");
      const input = document.getElementById("jobId");
      input.value = value;
      searchState.selectedType = type;
      searchState.selectedValue = value;
      box.hidden = true;
      box.innerHTML = "";
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  await window.authReady;

  const input = document.getElementById("jobId");
  const loadBtn = document.getElementById("loadBtn");

  if (filterControls.type) {
    filterControls.type.addEventListener("change", () => {
      filterState.type = filterControls.type.value;
      applyFilters();
    });
  }
  if (filterControls.status) {
    filterControls.status.addEventListener("change", () => {
      filterState.status = filterControls.status.value;
      applyFilters();
    });
  }
  if (filterControls.depth) {
    filterState.depth = parseInt(filterControls.depth.value || "1", 10) || 1;
    filterControls.depth.addEventListener("change", () => {
      filterState.depth = parseInt(filterControls.depth.value || "1", 10) || 1;
      const ctxDepth = document.getElementById("ctx-depth");
      if (ctxDepth) ctxDepth.value = String(filterState.depth);
    });
  }

  actionButtons.focus?.addEventListener("click", () => {
    if (!selectedCyNode || !window.cy) return;
    window.cy.animate({ center: { eles: selectedCyNode }, zoom: Math.min(window.cy.maxZoom(), Math.max(window.cy.zoom(), 1.2)) }, { duration: 350, easing: "ease-out" });
  });
  actionButtons.expandUp?.addEventListener("click", () => selectedCyNode && expandFrom(selectedCyNode, "upstream"));
  actionButtons.expandDown?.addEventListener("click", () => selectedCyNode && expandFrom(selectedCyNode, "downstream"));
  actionButtons.expandBoth?.addEventListener("click", () => selectedCyNode && expandFrom(selectedCyNode, "both"));
  actionButtons.layout?.addEventListener("click", () => {
    if (!window.cy) return;
    window.cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160 }).run();
  });
  actionButtons.clearSelection?.addEventListener("click", () => {
    clearSelection();
    clearExpandButtons();
  });
  actionButtons.highlight?.addEventListener("click", () => {
    if (!selectedCyNode || !window.cy) return;
    const neighbors = selectedCyNode.closedNeighborhood();
    window.cy.nodes().addClass("dimmed");
    window.cy.edges().addClass("dimmed");
    neighbors.removeClass("dimmed").addClass("connected");
    neighbors.connectedEdges().removeClass("dimmed").addClass("highlighted");
  });
  actionButtons.resetGraph?.addEventListener("click", () => {
    if (!window.cy) return;
    clearSelection();
    window.cy.fit();
    applyFilters();
  });

  const onInput = debounce(async () => {
    const q = input.value.trim();
    searchState.selectedType = null;
    searchState.selectedValue = null;
    if (q.length < 1) {
      document.getElementById("suggestions").hidden = true;
      document.getElementById("suggestions").innerHTML = "";
      return;
    }
    const box = document.getElementById("suggestions");
    box.hidden = false;
    box.innerHTML = '<div class="loading">Loading…</div>';
    try {
      const data = await fetchSuggestions(q);
      renderSuggestionsBox(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        box.innerHTML = '<div class="group">No results</div>';
      }
    }
  }, 200);

  input.addEventListener("input", onInput);
  input.addEventListener("blur", () =>
    setTimeout(() => {
      const box = document.getElementById("suggestions");
      if (!box.matches(":hover")) {
        box.hidden = true;
        box.innerHTML = "";
      }
    }, 150)
  );
  input.addEventListener("keydown", (e) => {
    const box = document.getElementById("suggestions");
    if (e.key === "Escape") {
      box.hidden = true;
      box.innerHTML = "";
    } else if (e.key === "Enter") {
      e.preventDefault();
      const items = Array.from(box.querySelectorAll(".item"));
      const idx = searchState.activeIndex;
      if (!box.hidden && items.length && idx >= 0 && idx < items.length) {
        items[idx].click();
      } else {
        document.getElementById("loadBtn").click();
      }
    } else if (e.key === "ArrowDown") {
      const items = Array.from(box.querySelectorAll(".item"));
      if (!items.length) return;
      e.preventDefault();
      searchState.activeIndex = (searchState.activeIndex + 1) % items.length;
      items.forEach((i) => i.classList.remove("active"));
      items[searchState.activeIndex].classList.add("active");
      items[searchState.activeIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      const items = Array.from(box.querySelectorAll(".item"));
      if (!items.length) return;
      e.preventDefault();
      searchState.activeIndex = (searchState.activeIndex - 1 + items.length) % items.length;
      items.forEach((i) => i.classList.remove("active"));
      items[searchState.activeIndex].classList.add("active");
      items[searchState.activeIndex].scrollIntoView({ block: "nearest" });
    }
  });

  loadBtn.addEventListener("click", async () => {
    const raw = input.value.trim();
    if (!raw) return;
    let type = searchState.selectedType;
    let value = searchState.selectedValue || raw;
    if (!type) {
      type = raw.includes(".") ? "table" : "job";
    }
    try {
      showGraphStatus("Loading graph…", true);
      const data = await fetchNeighbors(type, value, filterState.depth);
      renderGraph(data);
      showGraphStatus("", false);
    } catch (err) {
      const handled = handleAuthError(err);
      if (!handled) {
        showGraphStatus("Failed to load graph", true);
        setTimeout(() => showGraphStatus("", false), 2000);
      }
    }
  });

  renderGraph({ nodes: [], edges: [] });
  attachTriggerStream();
  document.addEventListener("auth:state-changed", (evt) => {
    if (evt.detail?.authenticated) {
      attachTriggerStream();
    } else {
      closeTriggerStream();
      renderGraph({ nodes: [], edges: [] });
    }
  });
});

document.getElementById("ctx-menu")?.addEventListener("contextmenu", (e) => e.preventDefault());

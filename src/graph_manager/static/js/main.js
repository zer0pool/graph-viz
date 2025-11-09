cytoscape.use(cytoscapeDagre);

// Global selection state for search
const searchState = {
  selectedType: null, // 'job' | 'table'
  selectedValue: null,
  itemsCount: 0,
  activeIndex: -1,
};

function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function fetchSuggestions(q) {
  const res = await fetch(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
  return res.json();
}

async function fetchNeighbors(kind, value) {
  const base = `/api/v1/graph/${kind}/${encodeURIComponent(value)}/neighbors?level=1`;
  const res = await fetch(base);
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
      { selector: "node", style: { shape: "round-rectangle", width: 200, height: 60, "background-color": "#fff", "border-width": 2, "border-color": "#cdd9e5", label: "data(label)", color: "#24292f", "text-valign": "center", "text-halign": "center", "font-size": "13px", "font-weight": "500", "text-wrap": "wrap", "text-max-width": "180px" } },
      { selector: "node[type='table']", style: { shape: "ellipse", "background-color": "#f0f7ff", "border-color": "#0969da" } },
      { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle", "line-color": "#8b949e", "target-arrow-color": "#8b949e", width: 2 } },
      { selector: "edge[io='input']", style: { "line-style": "dashed" } },
    ],
  }));

  // Prevent native context menu inside the graph container
  const cyContainer = document.getElementById('cy');
  cyContainer?.addEventListener('contextmenu', (e) => e.preventDefault());

  const nodes = (data.nodes || []).map((n) => ({ data: { id: n.id, label: n.label, type: n.type || "job" } }));
  const edges = (data.edges || []).map((e) => ({ data: { id: e.id || `${e.source}_${e.target}`, source: e.source, target: e.target, io: e.io || "" } }));
  cy.add([...nodes, ...edges]);

  cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 100, rankSep: 120 }).run();
  cy.minimap({ zoomFactor: 3.0 });

  // Initial view: fit, then scale down to ~1/4 area (half zoom), and center
  if ((nodes.length + edges.length) > 0) {
    cy.fit();
    const target = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * 0.5));
    cy.zoom(target);
    cy.center();
  }

  const panel = document.getElementById("side-panel");
  const infoDiv = document.getElementById("node-info");
  const closeBtn = document.getElementById("close-panel");
  const ctxMenu = document.getElementById("ctx-menu");
  const ctxDir = document.getElementById("ctx-direction");
  const ctxDepth = document.getElementById("ctx-depth");
  const ctxLimit = document.getElementById("ctx-limit");
  const ctxCancel = document.getElementById("ctx-cancel");
  const ctxExpand = document.getElementById("ctx-expand");
  const ctxHint = document.getElementById("ctx-hint");
  let ctxTargetNode = null;

  cy.on("tap", "node", (evt) => {
    const n = evt.target;
    const incoming = n.incomers("node").map((x) => x.data("label"));
    const outgoing = n.outgoers("node").map((x) => x.data("label"));
    infoDiv.innerHTML = `
      <p><b>ID:</b> ${n.data("id")}</p>
      <p><b>Type:</b> ${n.data("type")}</p>
      <p><b>Label:</b> ${n.data("label")}</p>
      <p><b>Upstream:</b> ${incoming.join(", ") || "-"}</p>
      <p><b>Downstream:</b> ${outgoing.join(", ") || "-"}</p>
    `;
    panel.classList.add("open");
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
      const res = await fetch(`/api/v1/graph/expand?${params.toString()}`);
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

  cy.on("tap", (evt) => {
    if (evt.target === cy) panel.classList.remove("open");
  });
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  // Keep fit button behavior as-is; initial fit handled above

  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const fitBtn = document.getElementById("fitBtn");
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
  fitBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    cy.fit();
    updateZoomDisplay();
  });
  cy.on("zoom", updateZoomDisplay);
  updateZoomDisplay();
}

function mergeGraph(cy, data, anchorId, direction) {
  const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
  const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
  let addedNodes = 0;
  let addedEdges = 0;
  const addedNodeIds = [];

  // Add nodes (dedup) and track additions
  (data.nodes || []).forEach(n => {
    const id = n.id;
    if (!existingNodeIds.has(id)) {
      cy.add({ data: { id: n.id, label: n.label, type: n.type || 'job' } });
      addedNodes++;
      existingNodeIds.add(id);
      addedNodeIds.push(id);
    }
  });

  // Add edges (dedup)
  (data.edges || []).forEach(e => {
    const id = e.id || `${e.source}_${e.target}_${e.io || ''}`;
    if (!existingEdgeIds.has(id)) {
      cy.add({ data: { id, source: e.source, target: e.target, io: e.io || '' } });
      addedEdges++;
      existingEdgeIds.add(id);
    }
  });

  // Heuristic non-overlap placement: upstream left, downstream right of anchor
  try {
    if (addedNodeIds.length && anchorId) {
      const anchor = cy.$(`#${anchorId}`);
      if (anchor && anchor.nonempty()) {
        const pos = anchor.position();
        const dx = 240; // horizontal spacing
        const dy = 90;  // vertical spacing per node

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

  return { nodes: addedNodes, edges: addedEdges };
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

document.addEventListener("DOMContentLoaded", () => {
  // Block all native context menus globally
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const input = document.getElementById("jobId");
  const loadBtn = document.getElementById("loadBtn");

  const onInput = debounce(async () => {
    const q = input.value.trim();
    searchState.selectedType = null;
    searchState.selectedValue = null;
    if (q.length < 1) {
      document.getElementById("suggestions").hidden = true;
      document.getElementById("suggestions").innerHTML = "";
      return;
    }
    // Show loading state
    const box = document.getElementById("suggestions");
    box.hidden = false;
    box.innerHTML = '<div class="loading">Loading…</div>';
    try {
      const data = await fetchSuggestions(q);
      renderSuggestionsBox(data);
    } catch (_) {
      // ignore suggest errors for UX
      box.innerHTML = '<div class="group">No results</div>';
    }
  }, 200);

  input.addEventListener("input", onInput);
  // Hide suggestions when focus leaves the input (small delay to allow click)
  input.addEventListener("blur", () => setTimeout(() => {
    const box = document.getElementById("suggestions");
    if (!box.matches(':hover')) {
      box.hidden = true;
      box.innerHTML = "";
    }
  }, 150));
  input.addEventListener("keydown", (e) => {
    const box = document.getElementById("suggestions");
    if (e.key === "Escape") {
      const box = document.getElementById("suggestions");
      box.hidden = true;
      box.innerHTML = "";
    } else if (e.key === "Enter") {
      e.preventDefault();
      // If a suggestion is active, choose it; else trigger search
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
      // heuristics: table names often contain dots
      type = raw.includes(".") ? "table" : "job";
    }
    const data = await fetchNeighbors(type, value);
    renderGraph(data);
  });

  // Initial empty graph
  renderGraph({ nodes: [], edges: [] });
});
  // Prevent native context menu on the overlay/panel as well
  ctxMenu?.addEventListener('contextmenu', (e) => e.preventDefault());

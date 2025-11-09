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

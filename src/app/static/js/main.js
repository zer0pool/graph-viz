cytoscape.use(cytoscapeDagre);

async function fetchGraph() {
  const res = await fetch("/api/graph");
  return res.json();
}

function toElements(data) {
  const nodes = data.nodes.map((n) => ({
    data: { id: n.id, label: n.label, status: n.status || "pending" },
  }));
  const edges = data.edges.map((e) => ({
    data: {
      id: e.id || e.source + "_" + e.target,
      source: e.source,
      target: e.target,
      label: e.label || "",
    },
  }));
  return [...nodes, ...edges];
}

async function draw() {
  const data = await fetchGraph();

  if (window.cy && typeof window.cy.destroy === "function") window.cy.destroy();

  window.cy = cytoscape({
    container: document.getElementById("cy"),
    elements: toElements(data),
    layout: { name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160, fit: true },
    minZoom: 0.6,
    maxZoom: 2.0,
    wheelSensitivity: 0.5,
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 200,
          height: 70,
          "background-color": "#fff",
          "border-width": 2,
          "border-color": "#cdd9e5",
          label: "data(label)",
          color: "#24292f",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "13px",
          "font-weight": "500",
          "text-wrap": "wrap",
          "text-max-width": "180px",
        },
      },
      { selector: "node[status='success']", style: { "background-color": "#e6ffed", "border-color": "#1f883d" } },
      { selector: "node[status='failure']", style: { "background-color": "#ffeef0", "border-color": "#d1242f" } },
      { selector: "node[status='pending']", style: { "background-color": "#f6f8fa", "border-color": "#8b949e" } },
      { selector: "edge", style: { "curve-style": "segments", "target-arrow-shape": "triangle", "line-color": "#8b949e", "target-arrow-color": "#8b949e", width: 2 } },
    ],
  });

  // ✅ 미니맵 추가
  cy.minimap({
    position: 'top-right',  // 우측 상단
    zoomFactor: 3.00,       // 축소 비율
  });

  // ✅ 노드 클릭 패널 표시
  const panel = document.getElementById("side-panel");
  const infoDiv = document.getElementById("node-info");
  const closeBtn = document.getElementById("close-panel");

  window.cy.on("tap", "node", (evt) => {
    const n = evt.target;
    const incoming = n.incomers("node").map((x) => x.data("label"));
    const outgoing = n.outgoers("node").map((x) => x.data("label"));
    infoDiv.innerHTML = `
      <p><b>ID:</b> ${n.data("id")}</p>
      <p><b>Label:</b> ${n.data("label")}</p>
      <p><b>Status:</b> ${n.data("status")}</p>
      <p><b>Upstream:</b> ${incoming.join(", ") || "-"}</p>
      <p><b>Downstream:</b> ${outgoing.join(", ") || "-"}</p>
    `;
    panel.classList.add("open");
  });

  window.cy.on("tap", (evt) => {
    if (evt.target === window.cy) panel.classList.remove("open");
  });

  closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  window.cy.fit();

  // ✅ 줌 컨트롤
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const fitBtn = document.getElementById("fitBtn");
  const zoomLevelText = document.getElementById("zoom-level");

  function updateZoomDisplay() {
    if (zoomLevelText)
      zoomLevelText.textContent = `${Math.round(window.cy.zoom() * 100)}%`;
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const newZoom = Math.min(window.cy.zoom() * 1.2, window.cy.maxZoom());
      window.cy.zoom(newZoom);
      window.cy.center();
      updateZoomDisplay();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const newZoom = Math.max(window.cy.zoom() * 0.8, window.cy.minZoom());
      window.cy.zoom(newZoom);
      window.cy.center();
      updateZoomDisplay();
    });
  }

  if (fitBtn) {
    fitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.cy.fit();
      updateZoomDisplay();
    });
  }

  window.cy.on("zoom", updateZoomDisplay);
  updateZoomDisplay();
}

// ✅ DOM 완전히 로드된 후 실행
document.addEventListener("DOMContentLoaded", () => {
  draw();
});

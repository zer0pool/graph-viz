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

  if (window.cy && typeof window.cy.destroy === "function") {
    window.cy.destroy();
  }

  window.cy = cytoscape({
    container: document.getElementById("cy"),
    elements: toElements(data),
    layout: {
      name: "dagre",
      rankDir: "LR",
      nodeSep: 120,
      rankSep: 160,
      fit: true,
    },
    style: [
      {
        selector: "node", style: {
          shape: "round-rectangle",
          width: 200,
          height: 70,
          "background-color": "#fff",
          "border-width": 2,
          "border-color": "#cdd9e5",
          "border-radius": 10,
          "box-shadow": "0 2px 6px rgba(0,0,0,0.06)",
          label: "data(label)",
          color: "#24292f",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "13px",
          "font-weight": "500",
          "text-wrap": "wrap",
          "text-max-width": "180px",
        }
      },
      { selector: "node[status='success']", style: { "background-color": "#e6ffed", "border-color": "#1f883d" } },
      { selector: "node[status='failure']", style: { "background-color": "#ffeef0", "border-color": "#d1242f" } },
      { selector: "node[status='pending']", style: { "background-color": "#f6f8fa", "border-color": "#8b949e" } },
      {
        selector: "edge", style: {
          "curve-style": "segments",
          "segment-distances": [20, 20],
          "segment-weights": [0.5, 0.5],
          "target-arrow-shape": "triangle",
          "line-color": "#8b949e",
          "target-arrow-color": "#8b949e",
          width: 2,
          opacity: 0.9,
        }
      },
      { selector: "edge:hover", style: { "line-color": "#0969da", "target-arrow-color": "#0969da", width: 3 } },
    ],
  });

  window.cy.userZoomingEnabled(true);
  window.cy.userPanningEnabled(true);
  window.cy.fit();

  // 🧩 노드 클릭 시 세부정보 표시
  window.cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const id = node.data("id");
    const label = node.data("label");
    const status = node.data("status");

    // 연결 관계
    const incoming = node.incomers("node").map((n) => n.data("label"));
    const outgoing = node.outgoers("node").map((n) => n.data("label"));

    const infoDiv = document.getElementById("node-info");
    infoDiv.innerHTML = `
      <p><b>ID:</b> ${id}</p>
      <p><b>Label:</b> ${label}</p>
      <p><b>Status:</b> ${status}</p>
      <p><b>Upstream:</b> ${incoming.join(", ") || "-"}</p>
      <p><b>Downstream:</b> ${outgoing.join(", ") || "-"}</p>
    `;
  });
}

draw();
window.cy.resize();
window.cy.fit();
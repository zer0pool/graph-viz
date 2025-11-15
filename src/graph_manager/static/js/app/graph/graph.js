import { getGraphStyles } from "./styles.js";
import { SELECTORS } from "../config.js";

export class GraphController {
  constructor({ panel, filterState, selectionState, relationState, api, searchState }) {
    this.panel = panel;
    this.filterState = filterState;
    this.selectionState = selectionState;
    this.relations = relationState;
    this.api = api;
    this.searchState = searchState;
    this.cy = null;
  }

  init(container) {
    if (this.cy) {
      this.cy.destroy();
    }
    this.cy = cytoscape({
      container,
      layout: { name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160 },
      minZoom: 0.6,
      maxZoom: 3.0,
      wheelSensitivity: 0.3,
      style: getGraphStyles(),
    });
    this.bindGraphEvents();
    this.bindZoomControls();
    return this.cy;
  }

  bindGraphEvents() {
    const cy = this.cy;
    cy.on("mouseover", "node", (evt) => {
      this.highlightNeighborhood(evt.target);
    });
    cy.on("mouseout", "node", () => {
      if (!this.selectionState.node) this.resetHighlight();
    });
    cy.on("tap", "node", (evt) => {
      this.selectNode(evt.target);
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) this.clearSelection();
    });
  }

  bindZoomControls() {
    const zoomIn = document.querySelector(SELECTORS.zoomControls.in);
    const zoomOut = document.querySelector(SELECTORS.zoomControls.out);
    const reset = document.querySelector(SELECTORS.zoomControls.reset);
    const zoomReset = document.querySelector(SELECTORS.zoomControls.zoomReset);
    const minimap = document.querySelector(SELECTORS.zoomControls.minimap);
    const updateZoomDisplay = () => {
      const label = document.getElementById("zoom-level");
      if (label && this.cy) label.textContent = `${Math.round(this.cy.zoom() * 100)}%`;
    };
    zoomIn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!this.cy) return;
      const target = Math.min(this.cy.zoom() * 1.2, this.cy.maxZoom());
      this.cy.zoom(target);
      this.cy.center();
      updateZoomDisplay();
    });
    zoomOut?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!this.cy) return;
      const target = Math.max(this.cy.zoom() * 0.8, this.cy.minZoom());
      this.cy.zoom(target);
      this.cy.center();
      updateZoomDisplay();
    });
    reset?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!this.cy) return;
      this.cy.fit();
      this.cy.center();
      updateZoomDisplay();
    });
    zoomReset?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!this.cy) return;
      this.cy.zoom(1.0);
      this.cy.center();
      updateZoomDisplay();
    });
    minimap?.addEventListener("click", (e) => {
      e.preventDefault();
      const mm = document.querySelector(".cy-minimap");
      if (mm) mm.style.display = mm.style.display === "none" ? "block" : "none";
    });
    this.cy?.on("zoom", updateZoomDisplay);
    updateZoomDisplay();
  }

  renderGraph(payload) {
    if (!this.cy) throw new Error("Graph not initialized");
    this.cy.destroy();
    this.init(document.getElementById("cy"));
    const nodes = (payload.nodes || []).map((n) => this.serializeNode(n));
    const edges = (payload.edges || []).map((e) => ({
      data: {
        id: e.id || `${e.source}_${e.target}`,
        source: e.source,
        target: e.target,
        io: e.io || "",
      },
    }));
    this.cy.add([...nodes, ...edges]);
    this.cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 100, rankSep: 120 }).run();
    this.cy.minimap({ zoomFactor: 3.0 });
    if (nodes.length + edges.length) {
      this.cy.fit();
      this.cy.zoom(this.cy.zoom() * 0.5);
      this.cy.center();
    }
    this.panel.setPlaceholder();
    this.applyFilters();
  }

  serializeNode(n) {
    const type = n.type || "job";
    let label = n.label;
    if (type === "table" && label?.includes(".")) {
      label = label.split(".").pop();
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
  }

  highlightNeighborhood(node) {
    if (!this.cy) return;
    this.cy.nodes().addClass("dimmed");
    this.cy.edges().addClass("dimmed");
    node.removeClass("dimmed").addClass("connected");
    node.connectedEdges().removeClass("dimmed").addClass("highlighted");
    node.connectedNodes().removeClass("dimmed").addClass("connected");
  }

  resetHighlight() {
    if (!this.cy) return;
    this.cy.nodes().removeClass("dimmed connected pulse");
    this.cy.edges().removeClass("dimmed highlighted");
  }

  selectNode(node) {
    this.selectionState.set(node);
    if (this.cy) {
      this.cy.nodes().removeClass("selected");
    }
    this.resetHighlight();
    node.addClass("selected");
    this.panel.updateMetadata(node);
    this.panel.updateRelations(node);
    this.panel.renderTriggers(node);
  }

  clearSelection() {
    this.selectionState.clear();
    if (this.cy) {
      this.cy.nodes().removeClass("selected connected dimmed pulse");
      this.cy.edges().removeClass("highlighted dimmed");
    }
    this.panel.setPlaceholder();
  }

  applyFilters() {
    if (!this.cy) return;
    this.cy.batch(() => {
      this.cy.nodes().forEach((node) => {
        const type = (node.data("type") || "").toLowerCase();
        const status = (node.data("status") || "unknown").toLowerCase();
        const typePass = this.filterState.type === "all" || type === this.filterState.type;
        const statusPass = this.filterState.status === "all" || status === this.filterState.status;
        if (typePass && statusPass) node.removeClass("filtered-out");
        else node.addClass("filtered-out");
      });
    });
  }

  async expand(node, direction, depth) {
    const id = node.id();
    const data = node.data();
    const params = {
      direction,
      depth: String(depth),
      node_type: data.type === "table" ? "table" : "job",
    };
    const dbid = parseInt(id.slice(1), 10);
    if (!Number.isNaN(dbid)) params.node_db_id = String(dbid);
    if (data.type === "table") params.table_name = data.full_name || data.label;
    else params.node_id = data.label || id;
    const payload = await this.api.expand(params);
    this.mergeGraph(payload, id, direction);
  }

  mergeGraph(data, anchorId, direction) {
    const cy = this.cy;
    if (!cy) return;
    const existingNodes = new Set(cy.nodes().map((n) => n.id()));
    const existingEdges = new Set(cy.edges().map((e) => e.id()));
    const edgeKeys = new Set(cy.edges().map((e) => `${e.data("source")}__${e.data("target")}__${e.data("io") || ""}`));
    const addedNodeIds = [];
    (data.nodes || []).forEach((raw) => {
      if (!existingNodes.has(raw.id)) {
        const added = cy.add(this.serializeNode(raw));
        added.addClass("just-added");
        setTimeout(() => added.removeClass("just-added"), 600);
        addedNodeIds.push(raw.id);
        existingNodes.add(raw.id);
      }
    });
    (data.edges || []).forEach((edge) => {
      const key = `${edge.source}__${edge.target}__${edge.io || ""}`;
      if (edgeKeys.has(key)) return;
      if (existingEdges.has(key)) return;
      cy.add({ data: { id: key, source: edge.source, target: edge.target, io: edge.io || "" } });
      edgeKeys.add(key);
    });
    this.positionNewNodes(anchorId, addedNodeIds, direction);
    this.applyFilters();
  }

  positionNewNodes(anchorId, nodeIds, direction) {
    if (!nodeIds.length || !this.cy) return;
    const anchor = this.cy.$(`#${anchorId}`);
    if (!anchor.nonempty()) return;
    const pos = anchor.position();
    const dx = 320;
    const dy = 120;
    const left = [];
    const right = [];
    nodeIds.forEach((id, index) => {
      if (direction === "upstream") left.push({ id, index });
      else if (direction === "downstream") right.push({ id, index });
      else (index % 2 === 0 ? left : right).push({ id, index });
    });
    left.forEach(({ id, index }) => {
      const node = this.cy.$(`#${id}`);
      if (node.nonempty()) node.position({ x: pos.x - dx, y: pos.y + (index - left.length / 2) * dy });
    });
    right.forEach(({ id, index }) => {
      const node = this.cy.$(`#${id}`);
      if (node.nonempty()) node.position({ x: pos.x + dx, y: pos.y + (index - right.length / 2) * dy });
    });
  }
}

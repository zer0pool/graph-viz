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
    this.currentCenterId = null;
    this.nodePositions = new Map();
    this.viewport = null;
    this.lastLayoutDirection = "horizontal";
  }

  init(container) {
    if (this.cy) {
      this.cacheViewport();
      this.cachePositions();
      this.cy.destroy();
    }
    this.cy = cytoscape({
      container,
      layout: { name: "concentric", minNodeSpacing: 120, levelWidth: () => 1 },
      minZoom: 0.6,
      maxZoom: 3.0,
      style: getGraphStyles(),
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autounselectify: false,
    });
    this.bindGraphEvents();
    this.bindZoomControls();
    this.registerPositionEvents();
    this.registerViewportEvents();
    return this.cy;
  }

  bindGraphEvents() {
    const cy = this.cy;
    cy.on("mouseover", "node", (evt) => {
      evt.target.addClass("hovered");
      this.highlightNeighborhood(evt.target);
    });
    cy.on("mouseout", "node", (evt) => {
      evt.target.removeClass("hovered");
      if (!this.selectionState.node) this.resetHighlight();
    });
    cy.on("tap", "node", (evt) => {
      const target = evt.target;
      if (this.didTapExpandHandle(evt)) {
        const depth = this.filterState?.depth ?? 1;
        this.expand(target, "both", depth).catch((err) => console.warn("expand via handle failed", err));
        return;
      }
      this.selectNode(target);
      this.highlightNeighborhood(target);
      this.panel.renderTriggers(target);
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

  renderGraph(payload, options = {}) {
    if (options.resetViewport) this.viewport = null;
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
    const layoutDirection = options.forceLayoutDirection || this.lastLayoutDirection;
    const shouldForceLayout = !this.nodePositions.size || options.forceLayoutDirection;
    if (shouldForceLayout) {
      this.forceLayout(layoutDirection, false);
    } else {
      this.applyCachedPositions();
      this.positionNodes(options.centerLabel);
      this.applyViewport();
      this.cachePositions();
      this.cacheViewport();
    }
    this.cy.minimap({ zoomFactor: 3.0 });
    this.panel.setPlaceholder();
    this.applyFilters();
  }

  serializeNode(n) {
    const type = n.type || "job";
    const fallback = n.label || n.name || n.job_id || n.full_name || n.id;
    let primary = fallback;
    let secondary = "";
    if (type === "table") {
      const fullName = n.full_name || fallback || "";
      if (fullName.includes(".")) {
        const parts = fullName.split(".");
        primary = parts.pop();
        secondary = parts.join(".");
      } else if (fallback?.includes(".")) {
        const parts = fallback.split(".");
        primary = parts.pop();
        secondary = parts.join(".");
      }
    } else {
      primary = fallback;
      secondary = n.schedule || n.metadata?.schedule || n.metadata?.job_type || "";
    }
    const labelText =
      type === "table" ? primary : secondary ? `${primary}\n${secondary}` : primary;
    return {
      data: {
        id: n.id,
        label: primary,
        label_text: labelText,
        sub_label: secondary,
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
    this.cy.nodes().removeClass("dimmed connected pulse hovered");
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
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("detail-panel:selection", { detail: { hasSelection: true } }));
    }
  }

  clearSelection() {
    this.selectionState.clear();
    if (this.cy) {
      this.cy.nodes().removeClass("selected connected dimmed pulse");
      this.cy.edges().removeClass("highlighted dimmed");
    }
    this.panel.setPlaceholder();
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("detail-panel:selection", { detail: { hasSelection: false } }));
    }
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
    const upstreamAdded = [];
    const downstreamAdded = [];
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
      if (edge.target === anchorId) upstreamAdded.push(edge.source);
      if (edge.source === anchorId) downstreamAdded.push(edge.target);
    });
    if (direction === "upstream" && upstreamAdded.length === 0) upstreamAdded.push(...addedNodeIds);
    if (direction === "downstream" && downstreamAdded.length === 0) downstreamAdded.push(...addedNodeIds);
    this.positionNewRelative(anchorId, upstreamAdded, downstreamAdded);
    this.forceLayout(this.lastLayoutDirection, true);
    this.applyFilters();
  }

  positionNodes(centerLabel) {
    if (!this.cy) return;
    const center = this.findCenterNode(centerLabel);
    if (!center || !center.nonempty()) return;
    this.currentCenterId = center.id();
    let centerPos = this.nodePositions.get(center.id());
    if (!centerPos) {
      centerPos = { x: this.cy.width() / 2, y: this.cy.height() / 2 };
    }
    center.position(centerPos);
    const levels = this.computeLevels(center);
    this.positionByLevels(levels, centerPos);
    const unplaced = this.cy.nodes().filter((node) => !levels.has(node.id()));
    if (unplaced.length) this.spreadDetachedNodes(unplaced, centerPos);
    this.cy.resize();
    if (!this.viewport) {
      this.cy.fit(center, 100);
      this.cacheViewport();
    }
    this.cachePositions();
  }

  findCenterNode(label) {
    if (!this.cy) return null;
    if (label) {
      const match = this.cy.nodes().filter((node) => {
        const lbl = node.data("label");
        const full = node.data("full_name");
        return lbl === label || full === label;
      });
      if (match && match.nonempty()) return match[0];
    }
    if (this.currentCenterId) {
      const existing = this.cy.$(`#${this.currentCenterId}`);
      if (existing && existing.nonempty()) return existing;
    }
    const tables = this.cy.nodes("[type='table']");
    if (tables.nonempty()) return tables[0];
    const all = this.cy.nodes();
    return all.nonempty() ? all[0] : null;
  }

  spreadNodes(collection, centerPos, dx, spacing = 60) {
    const count = collection.length;
    if (!count) return;
    collection.forEach((node, idx) => {
      if (this.nodePositions.has(node.id())) return;
      const offset = (idx - (count - 1) / 2) * spacing;
      node.position({
        x: centerPos.x + dx,
        y: centerPos.y + offset,
      });
    });
  }

  spreadDetachedNodes(collection, origin, columns = 3, spacingX = 200, spacingY = 70) {
    if (!collection || !collection.length) return;
    collection.forEach((node, idx) => {
      if (this.nodePositions.has(node.id())) return;
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      node.position({
        x: origin.x + 300 + col * spacingX,
        y: origin.y + row * spacingY,
      });
    });
  }

  registerPositionEvents() {
    if (!this.cy) return;
    this.cy.on("dragfree", "node", (evt) => {
      const pos = evt.target.position();
      this.nodePositions.set(evt.target.id(), { x: pos.x, y: pos.y });
    });
  }

  cachePositions() {
    if (!this.cy) return;
    this.cy.nodes().forEach((node) => {
      const pos = node.position();
      this.nodePositions.set(node.id(), { x: pos.x, y: pos.y });
    });
  }

  applyCachedPositions() {
    if (!this.cy) return;
    const existing = new Set(this.cy.nodes().map((n) => n.id()));
    Array.from(this.nodePositions.keys()).forEach((id) => {
      if (!existing.has(id)) this.nodePositions.delete(id);
    });
    this.cy.nodes().forEach((node) => {
      const saved = this.nodePositions.get(node.id());
      if (saved) node.position(saved);
    });
  }

  positionNewRelative(anchorId, upstreamIds, downstreamIds) {
    if (!this.cy || !anchorId) return;
    const anchor = this.cy.$(`#${anchorId}`);
    if (!anchor.nonempty()) return;
    const base = anchor.position();
    const place = (ids, dx) => {
      const unique = Array.from(new Set(ids));
      if (!unique.length) return;
      unique.forEach((nid, idx) => {
        const node = this.cy.$(`#${nid}`);
        if (!node.nonempty()) return;
        if (this.nodePositions.has(nid)) return;
        const offset = (idx - (unique.length - 1) / 2) * 45;
        node.position({ x: base.x + dx, y: base.y + offset });
      });
    };
    place(upstreamIds, -210);
    place(downstreamIds, 210);
  }

  registerViewportEvents() {
    if (!this.cy) return;
    this.cy.on("zoom", () => this.cacheViewport());
    this.cy.on("pan", () => this.cacheViewport());
  }

  cacheViewport() {
    if (!this.cy) return;
    this.viewport = {
      zoom: this.cy.zoom(),
      pan: this.cy.pan(),
    };
  }

  applyViewport() {
    if (!this.cy || !this.viewport) return;
    this.cy.zoom(this.viewport.zoom);
    this.cy.pan(this.viewport.pan);
  }

  computeLevels(center) {
    const levels = new Map();
    if (!this.cy || !center) return levels;
    levels.set(center.id(), 0);
    const visit = (startNodes, delta, getNext) => {
      const queue = [...startNodes];
      queue.forEach((node) => {
        const base = levels.get(node.id());
        const neighbors = getNext(node);
        neighbors.forEach((n) => {
          if (levels.has(n.id())) return;
          levels.set(n.id(), base + delta);
          queue.push(n);
        });
      });
    };
    visit([center], -1, (node) => node.incomers("node"));
    visit([center], 1, (node) => node.outgoers("node"));
    return levels;
  }

  positionByLevels(levels, centerPos) {
    if (!levels || !levels.size) return;
    const groups = new Map();
    levels.forEach((lvl, nodeId) => {
      if (lvl === 0) return;
      if (!groups.has(lvl)) groups.set(lvl, []);
      groups.get(lvl).push(nodeId);
    });
    groups.forEach((ids, lvl) => {
      const nodes = ids
        .map((id) => this.cy.$(`#${id}`))
        .filter((n) => n && n.nonempty());
      if (!nodes.length) return;
      nodes.sort((a, b) => a.id().localeCompare(b.id()));
      nodes.forEach((node, idx) => {
        if (this.nodePositions.has(node.id())) return;
        const offset = (idx - (nodes.length - 1) / 2) * 45;
        node.position({
          x: centerPos.x + lvl * 170,
          y: centerPos.y + offset,
        });
      });
    });
  }

  forceLayout(direction = "horizontal", preserveViewport = true) {
    if (!this.cy) return;
    this.nodePositions.clear();
    const previousViewport = preserveViewport ? { zoom: this.cy.zoom(), pan: this.cy.pan() } : null;
    this.cy
      .layout({
        name: "dagre",
        rankDir: direction === "vertical" ? "TB" : "LR",
        nodeSep: 90,
        rankSep: 140,
        edgeSep: 8,
        animate: false,
      })
      .run();
    if (previousViewport) {
      this.cy.zoom(previousViewport.zoom);
      this.cy.pan(previousViewport.pan);
    }
    this.lastLayoutDirection = direction;
    this.cachePositions();
    this.cacheViewport();
  }

  didTapExpandHandle(evt) {
    const node = evt.target;
    if (!node || node.data("type") !== "table") return false;
    const pos = evt.renderedPosition;
    if (!pos) return false;
    const box = node.renderedBoundingBox({ includeLabels: true, includeOverlays: false });
    if (!box) return false;
    const handleWidth = 60;
    return pos.x >= box.x1 && pos.x <= box.x1 + handleWidth && pos.y >= box.y1 && pos.y <= box.y2;
  }
}

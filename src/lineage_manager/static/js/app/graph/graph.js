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
    this.minimapVisible = false;
    this.minimapEl = null;
    this.graphCanvas = document.getElementById("cy");
    this.listView = document.getElementById("list-view");
    this.listTableBody = document.querySelector("#node-list-table tbody");
    this.listDownloadBtn = document.getElementById("list-download");
    this.viewMode = "graph";
    this.listRows = [];
    this.listDownloadBound = false;
    this.baseGraph = null;
    this.baseCenterLabel = null;
    this.tooltip = null;
    this.hiddenNodes = new Set();
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
      minZoom: 0.5,
      maxZoom: 2.0,
      style: getGraphStyles(),
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autounselectify: false,
      autoungrabify: true,
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
      this.maybeShowJobTooltip(evt);
    });
    cy.on("mousemove", "node", (evt) => {
      this.maybeShowJobTooltip(evt, true);
    });
    cy.on("mouseout", "node", (evt) => {
      evt.target.removeClass("hovered");
      if (!this.selectionState.node) this.resetHighlight();
      this.hideTooltip();
    });
    cy.on("tap", "node", (evt) => {
      const target = evt.target;
      this.selectNode(target);
      this.highlightNeighborhood(target);
      this.panel.renderTriggers(target);
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) this.clearSelection();
    });
    cy.on("dbltap", "node", () => {
      document.dispatchEvent(new CustomEvent("detail-panel:toggle"));
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
      this.setMinimapVisible(!this.minimapVisible);
    });
    this.cy?.on("zoom", updateZoomDisplay);
    updateZoomDisplay();
  }

  renderGraph(payload, options = {}) {
    if (this.selectionState?.node) {
      this.clearSelection();
    }
    if (options.resetViewport) this.viewport = null;
    if (!this.cy) throw new Error("Graph not initialized");
    if (options.rememberInitial) {
      this.hiddenNodes.clear();
      this.baseGraph = JSON.parse(JSON.stringify(payload));
      this.baseCenterLabel = options.centerLabel || null;
    }
    this.cy.destroy();
    this.init(document.getElementById("cy"));
    const visibleNodes = (payload.nodes || []).filter((n) => !this.hiddenNodes.has(n.id));
    const nodes = visibleNodes.map((n) => this.serializeNode(n));
    const allowedNodeIds = new Set(visibleNodes.map((n) => n.id));
    const edges = (payload.edges || [])
      .filter((e) => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target))
      .map((e) => ({
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
    this.minimapVisible = false;
    const scheduleHide =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
    scheduleHide(() => {
      this.setMinimapVisible(false);
      if (this.cy) this.cy.zoom(1.0);
    });
    this.panel.setPlaceholder();
    this.applyFilters();
    this.updateListView();
    this.bindListDownload();
    this.updateToolbarVisibility();
    this.resetTableTabs();
    this.setViewMode(this.viewMode);
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
    const properties = n.properties || {};
    const metadata = n.metadata || {};
    const labels = n.labels || properties.labels || metadata.labels || null;
    const owner = n.owner || properties.owner || metadata.owner || null;
    const storageType =
      properties.storage_type || metadata.storage_type || properties.storage || metadata.storage || null;
    const partition =
      n.partition || properties.partition || properties.partition_field || metadata.partition || null;
    const createdAt = n.created_at || properties.created_at || metadata.created_at || n.updated_at || null;
    const tableOverview =
      properties["table.overview"] || properties.table_overview || metadata["table.overview"] || null;
    const tableSchema =
      properties["table.schema"] || properties.table_schema || metadata["table.schema"] || null;
    const tableActivity =
      properties["table.activity"] || properties.table_activity || metadata["table.activity"] || null;
    return {
      data: {
        id: n.id,
        label: primary,
        label_text: labelText,
        sub_label: secondary,
        type,
        full_name: n.full_name || n.label || null,
        owner,
        description: n.description || metadata.description,
        status: n.status || metadata.status,
        job_id: n.job_id,
        updated_at: n.updated_at,
        storage: storageType,
        partition,
        created_at: createdAt,
        labels,
        properties,
        metadata,
        table_overview: tableOverview,
        table_schema: tableSchema,
        table_activity: tableActivity,
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

  hideSelectedNode() {
    const node = this.selectionState?.node;
    if (!node) return false;
    return this.hideNodeById(node.id());
  }

  hideNodeById(nodeId) {
    if (!this.cy) return false;
    const target = typeof nodeId === "string" ? this.cy.$(`#${nodeId}`) : nodeId;
    if (!target || !target.nonempty()) return false;
    const id = target.id();
    this.hiddenNodes.add(id);
    this.nodePositions.delete(id);
    this.cy.remove(target);
    this.clearSelection();
    this.updateListView();
    this.updateToolbarVisibility();
    return true;
  }

  resetHiddenNodes() {
    this.hiddenNodes.clear();
  }

  resetGraphView() {
    if (this.selectionState?.node) {
      this.clearSelection();
    }
    this.hiddenNodes.clear();
    if (this.baseGraph) {
      const snapshot = JSON.parse(JSON.stringify(this.baseGraph));
      this.renderGraph(snapshot, { centerLabel: this.baseCenterLabel, resetViewport: true });
    } else if (this.cy) {
      this.cy.fit();
      this.cy.center();
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
      if (this.hiddenNodes.has(raw.id)) return;
      if (!existingNodes.has(raw.id)) {
        const added = cy.add(this.serializeNode(raw));
        added.addClass("just-added");
        setTimeout(() => added.removeClass("just-added"), 600);
        addedNodeIds.push(raw.id);
        existingNodes.add(raw.id);
      }
    });
    (data.edges || []).forEach((edge) => {
      if (this.hiddenNodes.has(edge.source) || this.hiddenNodes.has(edge.target)) return;
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
    this.updateListView();
    this.updateToolbarVisibility();
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
    const sample = collection[0];
    const baseHeight = sample?.height?.() || 30;
    const spacingY = Math.min(spacing, baseHeight);
    collection.forEach((node, idx) => {
      if (this.nodePositions.has(node.id())) return;
      const offset = (idx - (count - 1) / 2) * spacingY;
      node.position({
        x: centerPos.x + dx,
        y: centerPos.y + offset,
      });
    });
  }

  spreadDetachedNodes(collection, origin, columns = 3, spacingX = 200, spacingY = 70) {
    if (!collection || !collection.length) return;
    const sample = collection[0];
    const baseHeight = sample?.height?.() || 30;
    const baseWidth = sample?.width?.() || 120;
    const verticalSpacing = Math.min(spacingY, baseHeight);
    const horizontalSpacing =
      this.lastLayoutDirection === "vertical" ? Math.min(spacingX, baseWidth * 0.5) : spacingX;
    collection.forEach((node, idx) => {
      if (this.nodePositions.has(node.id())) return;
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      node.position({
        x: origin.x + 300 + col * horizontalSpacing,
        y: origin.y + row * verticalSpacing,
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
    const anchorWidth = anchor.width() || 120;
    const horizontalSpacing =
      this.lastLayoutDirection === "vertical" ? Math.min(anchorWidth * 0.5, 210) : 210;
    const place = (ids, dir) => {
      const unique = Array.from(new Set(ids));
      if (!unique.length) return;
      const nodes = unique
        .map((nid) => this.cy.$(`#${nid}`))
        .filter((node) => node && node.nonempty() && !this.nodePositions.has(node.id()));
      if (!nodes.length) return;
      const sample = nodes[0];
      const baseHeight = sample.height() || 30;
      const spacingY = Math.min(45, baseHeight);
      nodes.forEach((node, idx) => {
        const offset = (idx - (nodes.length - 1) / 2) * spacingY;
        node.position({ x: base.x + dir * horizontalSpacing, y: base.y + offset });
      });
    };
    place(upstreamIds, -1);
    place(downstreamIds, 1);
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
      const sample = nodes[0];
      const baseHeight = sample.height() || 30;
      const spacingY = Math.min(45, baseHeight);
      const baseWidth = sample.width() || 120;
      const spacingX = this.lastLayoutDirection === "vertical" ? Math.min(baseWidth * 0.5, 170) : 170;
      nodes.forEach((node, idx) => {
        if (this.nodePositions.has(node.id())) return;
        const offset = (idx - (nodes.length - 1) / 2) * spacingY;
        node.position({
          x: centerPos.x + lvl * spacingX,
          y: centerPos.y + offset,
        });
      });
    });
  }

  forceLayout(direction = "horizontal", preserveViewport = true) {
    if (!this.cy) return;
    this.nodePositions.clear();
    const previousViewport = preserveViewport ? { zoom: this.cy.zoom(), pan: this.cy.pan() } : null;
    const sample = this.cy.nodes()[0];
    const sampleHeight = sample?.height?.() || 40;
    const sampleWidth = sample?.width?.() || 120;
    const layout = {
      name: "dagre",
      rankDir: direction === "vertical" ? "TB" : "LR",
      nodeSep:
        direction === "vertical"
          ? Math.min(sampleWidth * 0.5, 80)
          : Math.min(sampleHeight, 90),
      rankSep:
        direction === "vertical"
          ? Math.max(sampleHeight, 90)
          : Math.max(sampleWidth + 30, 150),
      edgeSep: 8,
      animate: false,
    };
    this.cy.layout(layout).run();
    if (previousViewport) {
      this.cy.zoom(previousViewport.zoom);
      this.cy.pan(previousViewport.pan);
    }
    this.lastLayoutDirection = direction;
    this.cachePositions();
    this.cacheViewport();
  }

  setViewMode(mode = "graph") {
    this.viewMode = mode === "list" ? "list" : "graph";
    if (this.graphCanvas) this.graphCanvas.hidden = this.viewMode === "list";
    if (this.listView) this.listView.hidden = this.viewMode !== "list";
    if (this.viewMode === "graph" && this.cy) {
      this.cy.resize();
    }
  }

  updateListView() {
    if (!this.listTableBody) return;
    if (!this.cy) {
      this.listTableBody.innerHTML = "";
      this.listRows = [];
      return;
    }
    const rows = this.cy
      .nodes()
      .map((node) => {
        const data = node.data();
        return {
          name: data.label || node.id(),
          type: (data.type || "job").toUpperCase(),
          owner: data.owner || "-",
          updated: data.updated_at || data.updated || "-",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    this.listRows = rows;
    if (!rows.length) {
      this.listTableBody.innerHTML = '<tr><td colspan="4">No nodes in view.</td></tr>';
      return;
    }
    this.listTableBody.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.name}</td>
          <td>${row.type}</td>
          <td>${row.owner}</td>
          <td>${row.updated}</td>
        </tr>`
      )
      .join("");
  }

  bindListDownload() {
    if (this.listDownloadBound || !this.listDownloadBtn) return;
    this.listDownloadBtn.addEventListener("click", () => this.downloadList());
    this.listDownloadBound = true;
  }

  downloadList() {
    if (!this.listRows.length) {
      alert("No nodes to download.");
      return;
    }
    const header = ["Name", "Type", "Owner", "Updated"];
    const csvRows = [header.join(",")].concat(
      this.listRows.map((row) => [row.name, row.type, row.owner, row.updated].map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lineage-nodes.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getMinimapElement() {
    if (typeof document === "undefined") return null;
    if (this.minimapEl && document.body.contains(this.minimapEl)) {
      return this.minimapEl;
    }
    this.minimapEl = document.querySelector(".cy-minimap");
    return this.minimapEl;
  }

  setMinimapVisible(visible) {
    this.minimapVisible = Boolean(visible);
    const mm = this.getMinimapElement();
    if (mm) {
      mm.style.display = this.minimapVisible ? "block" : "none";
    }
  }

  updateToolbarVisibility() {
    const toolbar = document.getElementById("graph-toolbar");
    if (!toolbar) return;
    const hasGraph = this.cy && this.cy.nodes().length > 0;
    toolbar.hidden = !hasGraph;
    if (!hasGraph) this.setMinimapVisible(false);
  }

  resetTableTabs() {
    const tabs = document.querySelectorAll("#table_tabs .detail-tab");
    const panels = document.querySelectorAll('.detail-tab-panels[data-tab-group="table"] .detail-pane');
    if (!tabs.length) return;
    tabs.forEach((tab) => {
      const isOverview = (tab.dataset.tab || "overview") === "overview";
      tab.classList.toggle("active", isOverview);
      tab.setAttribute("aria-selected", isOverview ? "true" : "false");
    });
    panels.forEach((pane) => {
      const isOverview = (pane.dataset.tabPanel || "overview") === "overview";
      pane.classList.toggle("active", isOverview);
    });
  }

  showTooltip(evt, text, repositionOnly = false) {
    const pos = this.getRenderedPosition(evt);
    if (!pos) return;
    if (!this.tooltip) {
      this.tooltip = document.createElement("div");
      this.tooltip.className = "graph-tooltip";
      document.body.appendChild(this.tooltip);
    }
    if (!repositionOnly) this.tooltip.textContent = text;
    Object.assign(this.tooltip.style, {
      display: "block",
      left: `${pos.x + 12}px`,
      top: `${pos.y + 12}px`,
    });
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.style.display = "none";
  }

  getRenderedPosition(evt) {
    if (!evt) return null;
    if (evt.renderedPosition) {
      const rect = this.graphCanvas?.getBoundingClientRect();
      return {
        x: (rect?.left || 0) + evt.renderedPosition.x,
        y: (rect?.top || 0) + evt.renderedPosition.y,
      };
    }
    if (this.cy && evt.position) {
      const renderer = this.cy.renderer();
      if (renderer?.projectIntoViewport) {
        const [x, y] = renderer.projectIntoViewport(evt.position.x, evt.position.y);
        return { x, y };
      }
    }
    return null;
  }


  maybeShowJobTooltip(evt, repositionOnly = false) {
    const node = evt.target;
    if (!node) return;
    const type = (node.data("type") || "").toLowerCase();
    if (type !== "job") {
      if (!repositionOnly) this.hideTooltip();
      return;
    }
    const jobId = node.data("job_id") || node.id();
    this.showTooltip(evt, `Job: ${jobId}`, repositionOnly);
  }
}

import { RelationState } from "../state.js";
import { JobDetailView, TableDetailView } from "./detailView.js";
import { TableTimelinessView } from "./timelinessView.js";

export class PanelController {
  constructor(apiClient) {
    this.api = apiClient;
    this.relations = new RelationState();
    this.elements = {
      title: document.getElementById("node-title"),
      badge: document.getElementById("node-type-badge"),
      triggerSection: document.getElementById("trigger-section"),
      triggerContainer: document.getElementById("node-triggers"),
      status: document.getElementById("graph-status"),
      statusText: document.getElementById("graph-status-text"),
    };
    this.jobView = new JobDetailView({
      section: document.getElementById("job-details"),
      label: document.getElementById("job-label"),
      tabs: document.getElementById("job_tabs"),
      panels: document.querySelector('.detail-tab-panels[data-tab-group="job"]'),
      runsBody: document.getElementById("job-runs-body"),
    });
    this.tableView = new TableDetailView({
      section: document.getElementById("table-details"),
      tabs: document.getElementById("table_tabs"),
      panels: document.querySelector('.detail-tab-panels[data-tab-group="table"]'),
      fullName: document.getElementById("table-full-name"),
      owner: document.getElementById("table-owner"),
      storage: document.getElementById("table-storage"),
      partition: document.getElementById("table-partition"),
      createdOverview: document.getElementById("table-created-overview"),
      labelsSection: document.getElementById("table-labels"),
      labelsList: document.getElementById("table-labels-list"),
      overviewMetaSection: document.getElementById("table-overview-meta"),
      overviewMetaList: document.getElementById("table-overview-list"),
      schemaValue: document.getElementById("table-schema"),
      rows: document.getElementById("table-rows"),
      createdSchema: document.getElementById("table-created-schema"),
    });
    this.timelinessView = new TableTimelinessView({
      pane: document.getElementById("activity-pane"),
      dailyChart: document.getElementById("timeliness-daily-chart"),
      hourlyChart: document.getElementById("timeliness-hourly-chart"),
      dailyPlaceholder: document.getElementById("timeliness-daily-placeholder"),
      hourlyPlaceholder: document.getElementById("timeliness-hourly-placeholder"),
      hourlyLabel: document.getElementById("timeliness-hourly-label"),
    });
    this.lineageUI = {
      pathPreview: document.getElementById("lineage-path-preview"),
      pathButton: document.getElementById("lineage-path-expand"),
      rootSummary: document.getElementById("lineage-root-summary"),
      rootButton: document.getElementById("lineage-root-expand"),
      leafSummary: document.getElementById("lineage-leaf-summary"),
      leafButton: document.getElementById("lineage-leaf-expand"),
      upstreamSummary: document.getElementById("lineage-upstream-summary"),
      downstreamSummary: document.getElementById("lineage-downstream-summary"),
      depthSummary: document.getElementById("lineage-depth-summary"),
      drawer: document.getElementById("lineage-drawer"),
      drawerTitle: document.getElementById("lineage-drawer-title"),
      drawerSubtitle: document.getElementById("lineage-drawer-subtitle"),
      drawerBody: document.getElementById("lineage-drawer-body"),
      drawerClose: document.getElementById("lineage-drawer-close"),
    };
    this.activeTabs = { table: "overview", job: "runs" };
    this.currentTable = null;
    this.currentTableNode = null;
    this.currentJob = null;
    this.isJobRunLoading = false;
    this.timelinessData = null;
    this.selectedTimelinessDay = null;
    this.isTimelinessLoading = false;
    this.lineageState = this.createEmptyLineageState();
    this.setPlaceholder();
    this.bindDetailTabEvents();
    this.bindLineageEvents();
    this.timelinessView.onDaySelected((date) => this.handleTimelinessDaySelection(date));
    document.addEventListener("detail-panel:resized", () => this.timelinessView.resize());
  }

  setPlaceholder() {
    if (this.elements.title) this.elements.title.textContent = "Search the graph";
    if (this.elements.badge) {
      this.elements.badge.textContent = "-";
      this.elements.badge.classList.add("muted");
    }
    this.jobView.hide();
    this.tableView.hide();
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = true;
    this.jobView.setRunsPlaceholder("Select a job to view run history.");
    this.jobView.setLabel("Select a node to view its details.");
    this.currentTable = null;
    this.currentTableNode = null;
    this.currentJob = null;
    this.activeTabs.table = "overview";
    this.activeTabs.job = "runs";
    this.isJobRunLoading = false;
    this.resetTimelinessState();
    this.lineageState = this.createEmptyLineageState();
    this.setLineagePlaceholder();
    this.closeLineageDrawer();
  }

  updateMetadata(node) {
    if (!node) return;
    const type = (node.data("type") || "job").toLowerCase();
    if (this.elements.title) this.elements.title.textContent = node.data("label") || node.id();
    if (this.elements.badge) {
      this.elements.badge.textContent = type === "table" ? "TABLE" : "JOB";
      this.elements.badge.classList.remove("muted");
    }
    console.info("DetailPanel:update", { id: node.id(), type });
    if (type === "table") this.renderTableDetails(node);
    else this.renderJobDetails(node);
  }

  updateRelations(node) {
    const upstream = node.incomers("node").map((x) => x.data("label"));
    const downstream = node.outgoers("node").map((x) => x.data("label"));
    this.relations.set(upstream, downstream);
  }

  async renderTriggers(node) {
    const section = this.elements.triggerSection;
    const container = this.elements.triggerContainer;
    if (!section || !container) return;
    if ((node.data("type") || "") !== "table") {
      section.hidden = true;
      return;
    }
    const tableName = node.data("full_name") || node.data("label");
    container.textContent = "Loading…";
    section.hidden = false;
    try {
      const payload = await this.api.fetchTableTriggers(tableName);
      if (payload.status !== "success") throw new Error("trigger data invalid");
      container.innerHTML = this.buildTriggerTable(payload.jobs || []);
      this.bindTriggerEvents(container, tableName);
    } catch (err) {
      container.textContent = "Failed to load triggers";
    }
  }

  buildTriggerTable(jobs) {
    if (!jobs.length) {
      return '<div class="badge-off">No consumers</div>';
    }
    const rows = jobs
      .map(
        (job) => `
        <div class="trigger-row">
          <div class="trigger-job">${job.name || job.job_id}</div>
          <label class="switch" title="Toggle trigger">
            <input type="checkbox" class="trigger-toggle" data-job="${job.job_id}" ${job.trigger ? "checked" : ""}>
            <span class="slider"></span>
          </label>
        </div>`
      )
      .join("");
    return `
      <div class="trigger-head">
        <span>Trigger Jobs</span>
        <button class="btn-pill danger" id="bulk-off">⛔ All OFF</button>
      </div>
      ${rows}`;
  }

  bindTriggerEvents(container, tableName) {
    container.querySelectorAll(".trigger-toggle").forEach((el) => {
      el.addEventListener("change", async () => {
        const jobId = el.getAttribute("data-job");
        const want = el.checked;
        const ok = window.confirm(`Change trigger for ${jobId}?`);
        if (!ok) {
          el.checked = !want;
          return;
        }
        try {
          await this.api.patchTableTrigger(tableName, jobId, want);
          this.syncBulkButton(container);
        } catch (err) {
          alert("Failed to update trigger");
          el.checked = !want;
        }
      });
    });
    const bulkBtn = container.querySelector("#bulk-off");
    if (bulkBtn) {
      this.syncBulkButton(container);
      bulkBtn.addEventListener("click", async () => {
        if (!window.confirm("Turn OFF all triggers?")) return;
        try {
          await this.api.bulkDisableTriggers(tableName);
          container.querySelectorAll(".trigger-toggle").forEach((el) => (el.checked = false));
          this.syncBulkButton(container);
        } catch (err) {
          alert("Bulk OFF failed");
        }
      });
    }
  }

  syncBulkButton(container) {
    const bulkBtn = container.querySelector("#bulk-off");
    if (!bulkBtn) return;
    const anyOn = Array.from(container.querySelectorAll(".trigger-toggle")).some((chk) => chk.checked);
    bulkBtn.disabled = !anyOn;
  }

  renderJobDetails(node) {
    this.tableView.hide();
    this.jobView.show();
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = true;
    this.currentTable = null;
    this.currentTableNode = null;
    this.setLineagePlaceholder();
    this.resetTimelinessState();
    this.currentJob = node.data("job_id") || node.id();
    this.isJobRunLoading = false;
    this.jobView.setLabel(node.data("label") || node.id());
    this.jobView.setRunsPlaceholder('Select "Run history" tab to load data.');
    if (this.activeTabs.job === "runs" && this.currentJob) {
      this.fetchJobRunHistory(true);
    }
  }

  renderTableDetails(node) {
    this.jobView.hide();
    this.tableView.show();
    this.currentJob = null;
    this.currentTable = node.data("full_name") || node.data("label") || null;
    this.currentTableNode = node;
    this.resetTimelinessState('Select "Activity" tab to load timeliness data.');
    const data = node.data();
    const props = data.properties || {};
    const metadata = data.metadata || {};
    const overviewMeta = data.table_overview || props["table.overview"] || null;
    const labels = data.labels || props.labels || metadata.labels || null;
    const createdAt = data.created_at || props.created_at || metadata.created_at || data.updated_at || "-";
    const schemaBlock = data.table_schema || props["table.schema"] || {};
    const schemaValue =
      schemaBlock.display_name ||
      schemaBlock.name ||
      schemaBlock.schema ||
      schemaBlock.namespace ||
      data.schema ||
      data.dataset ||
      props.dataset_name ||
      props.schema ||
      "-";
    const rows =
      schemaBlock.rows ||
      schemaBlock.row_count ||
      data.rows ||
      data.row_count ||
      props.row_count ||
      props.rows ||
      "-";
    const schemaCreated = schemaBlock.created_at || createdAt;
    const storage = this.resolveStorageDescriptor(data);
    const partition = data.partition || props.partition || props.partition_field || metadata.partition || "-";
    const owner = data.owner || props.owner || metadata.owner || "-";
    this.tableView.setMetadata({
      fullName: data.full_name || data.label || node.id(),
      owner,
      storage,
      partition,
      createdOverview: createdAt,
      labels,
      overviewMeta,
      schema: schemaValue,
      rows,
      createdSchema: schemaCreated,
    });
    this.updateLineageInsights();
    if (this.activeTabs.table === "activity" && this.currentTable) {
      this.ensureActivityData(true);
    }
  }

  bindDetailTabEvents() {
    document.addEventListener("detail-tabs:changed", (event) => {
      const group = event.detail?.group || "table";
      const tab = event.detail?.tab || (group === "table" ? "overview" : "runs");
      this.activeTabs[group] = tab;
      if (group === "table" && tab === "activity") {
        this.timelinessView.resize();
        if (this.currentTable) this.ensureActivityData();
        else {
          this.timelinessView.setIdle('Select "Activity" tab to load timeliness data.');
        }
      } else if (group === "table" && tab === "lineage") {
        if (this.currentTableNode) this.updateLineageInsights();
        else this.setLineagePlaceholder();
      } else if (group === "job" && tab === "runs" && this.currentJob) {
        this.fetchJobRunHistory();
      }
    });
  }

  resetTimelinessState(message) {
    this.timelinessData = null;
    this.selectedTimelinessDay = null;
    this.isTimelinessLoading = false;
    if (this.timelinessView) {
      this.timelinessView.reset(message || 'Select "Activity" tab to load timeliness data.');
    }
  }

  async fetchTimeliness(force = false) {
    if (!this.currentTable || !this.timelinessView) return;
    if (this.isTimelinessLoading && !force) return;
    this.isTimelinessLoading = true;
    this.timelinessView.setLoading("Loading timeliness…");
    const started = Date.now();
    try {
      const payload = await this.api.fetchTableTimeliness(this.currentTable);
      const elapsed = Date.now() - started;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      if (payload.status !== "success") throw new Error("timeliness failed");
      const result = payload.result || {};
      const daily = Array.isArray(result.daily_summary) ? result.daily_summary : [];
      this.timelinessData = {
        daily_summary: daily,
        hourly_detail: result.hourly_detail || {},
      };
      if (!daily.length) {
        this.selectedTimelinessDay = null;
      }
      this.timelinessView.renderDaily(daily, this.selectedTimelinessDay);
      const hasSelection =
        this.selectedTimelinessDay &&
        Array.isArray(this.timelinessData.hourly_detail?.[this.selectedTimelinessDay]);
      if (hasSelection) {
        this.timelinessView.renderHourly(
          this.selectedTimelinessDay,
          this.timelinessData.hourly_detail[this.selectedTimelinessDay]
        );
      } else {
        this.timelinessView.clearHourly();
      }
    } catch (err) {
      console.error("Timeliness fetch failed", err);
      this.timelinessView.setError("Failed to load timeliness.");
    } finally {
      this.isTimelinessLoading = false;
    }
  }

  handleTimelinessDaySelection(date) {
    if (!date) return;
    this.selectedTimelinessDay = date;
    this.renderTimelinessHourly(date);
  }

  renderTimelinessHourly(date) {
    if (!this.timelinessView || !this.timelinessData) return;
    if (!date) {
      this.timelinessView.clearHourly();
      return;
    }
    const daily = this.timelinessData?.daily_summary || [];
    if (!daily.length) {
      this.timelinessView.setIdle("No timeliness information for this table.");
      return;
    }
    this.timelinessView.setSelectedDate(date);
    const hourly = this.timelinessData?.hourly_detail?.[date];
    this.timelinessView.renderHourly(date, Array.isArray(hourly) ? hourly : []);
  }

  ensureActivityData(force = false) {
    if (!this.currentTable) return;
    this.fetchTimeliness(force);
  }

  async fetchJobRunHistory(force = false) {
    if (!this.currentJob) return;
    if (this.isJobRunLoading && !force) return;
    this.isJobRunLoading = true;
    this.jobView.setRunsPlaceholder("Loading run history…", true);
    const started = Date.now();
    try {
      const payload = await this.api.fetchJobRunHistory(this.currentJob);
      const elapsed = Date.now() - started;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      if (payload.status !== "success") throw new Error("run history failed");
      const rows = Array.isArray(payload.result?.timeline) ? payload.result.timeline : [];
      this.renderJobRunHistory(rows);
    } catch (err) {
      this.jobView.setRunsPlaceholder("Failed to load run history.");
    } finally {
      this.isJobRunLoading = false;
    }
  }

  renderJobRunHistory(rows) {
    if (!this.jobView) return;
    if (!rows.length) {
      this.jobView.setRunsPlaceholder("No run history available.");
      return;
    }
    this.jobView.renderRuns(rows);
  }

  resolveStorageDescriptor(data) {
    if (!data) return "Table";
    const props = data.properties || {};
    const metadata = data.metadata || {};
    const storage =
      data.storage ||
      props.storage_type ||
      props.storage ||
      metadata.storage_type ||
      metadata.destination_type ||
      props.destination_type;
    if (!storage) return "Table";
    if (typeof storage === "string") {
      return storage.charAt(0).toUpperCase() + storage.slice(1);
    }
    if (typeof storage === "object") {
      if (storage.type) return storage.type;
      if (storage.name) return storage.name;
    }
    return "Table";
  }

  bindLineageEvents() {
    const { pathButton, rootButton, leafButton, drawer, drawerClose } = this.lineageUI;
    pathButton?.addEventListener("click", () => this.openLineageDrawer("path"));
    rootButton?.addEventListener("click", () => this.openLineageDrawer("root"));
    leafButton?.addEventListener("click", () => this.openLineageDrawer("leaf"));
    drawerClose?.addEventListener("click", () => this.closeLineageDrawer());
    drawer?.addEventListener("click", (event) => {
      if (event.target === drawer) this.closeLineageDrawer();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.closeLineageDrawer();
    });
  }

  createEmptyLineageState() {
    return {
      pathNodes: [],
      pathPreview: "Select a table to analyze lineage.",
      rootTables: [],
      leafTables: [],
      upstream: { tables: 0, jobs: 0 },
      downstream: { tables: 0, jobs: 0 },
      depth: { upstream: 0, downstream: 0 },
    };
  }

  setLineagePlaceholder(message) {
    const placeholder = this.createEmptyLineageState();
    if (message) placeholder.pathPreview = message;
    this.lineageState = placeholder;
    this.updateLineageView(placeholder);
  }

  updateLineageInsights(node = this.currentTableNode) {
    if (!this.isTableNode(node)) {
      this.setLineagePlaceholder();
      return;
    }
    const insights = this.computeLineageInsights(node);
    this.lineageState = insights;
    this.updateLineageView(insights);
  }

  computeLineageInsights(node) {
    if (!this.isTableNode(node)) return this.createEmptyLineageState();
    const upstreamTables = this.collectDirectionalNodes(node, "upstream", (n) => this.isTableNode(n) && n.id() !== node.id());
    const downstreamTables = this.collectDirectionalNodes(node, "downstream", (n) => this.isTableNode(n));
    const upstreamJobs = this.collectDirectionalNodes(node, "upstream", (n) => this.isJobNode(n));
    const downstreamJobs = this.collectDirectionalNodes(node, "downstream", (n) => this.isJobNode(n));
    const rootCandidates = upstreamTables.filter((tbl) => tbl.predecessors("node[type='table']").length === 0);
    const leafCandidates = downstreamTables.filter((tbl) => tbl.successors("node[type='table']").length === 0);
    const upstreamDepth = this.computeDepth(node, "upstream");
    const downstreamDepth = this.computeDepth(node, "downstream");
    const pathNodes = this.buildPathToRoot(node, rootCandidates);
    return {
      pathNodes,
      pathPreview: this.formatPathPreview(pathNodes),
      rootTables: rootCandidates.map((tbl) => this.formatNodeInfo(tbl)),
      leafTables: leafCandidates.map((tbl) => this.formatNodeInfo(tbl)),
      upstream: { tables: upstreamTables.length, jobs: upstreamJobs.length },
      downstream: { tables: downstreamTables.length, jobs: downstreamJobs.length },
      depth: { upstream: upstreamDepth, downstream: downstreamDepth },
    };
  }

  collectDirectionalNodes(startNode, direction, predicate) {
    if (!startNode) return [];
    const queue = [startNode];
    const visited = new Set([startNode.id()]);
    const matches = new Map();
    while (queue.length) {
      const current = queue.shift();
      const neighbors =
        direction === "upstream" ? current.incomers("node") : current.outgoers("node");
      neighbors.forEach((next) => {
        if (!next || typeof next.id !== "function") return;
        const id = next.id();
        if (visited.has(id)) return;
        visited.add(id);
        queue.push(next);
        if (typeof predicate === "function" && predicate(next)) {
          matches.set(id, next);
        }
      });
    }
    return Array.from(matches.values());
  }

  computeDepth(startNode, direction) {
    if (!startNode) return 0;
    const visited = new Set([startNode.id()]);
    const queue = [{ node: startNode, depth: 0 }];
    let maxDepth = 0;
    while (queue.length) {
      const { node, depth } = queue.shift();
      const neighbors =
        direction === "upstream" ? node.incomers("node") : node.outgoers("node");
      neighbors.forEach((next) => {
        if (!next || typeof next.id !== "function") return;
        const id = next.id();
        if (visited.has(id)) return;
        const isTable = this.isTableNode(next);
        const nextDepth = isTable ? depth + 1 : depth;
        visited.add(id);
        queue.push({ node: next, depth: nextDepth });
        if (isTable) {
          maxDepth = Math.max(maxDepth, nextDepth);
        }
      });
    }
    return maxDepth;
  }

  buildPathToRoot(targetNode, roots) {
    if (!targetNode) return [];
    const cy = targetNode.cy?.();
    if (!cy) return [this.formatNodeInfo(targetNode)];
    let bestPath = null;
    (roots || []).forEach((root) => {
      if (!root) return;
      const result = cy.elements().aStar({ root, goal: targetNode, directed: true });
      if (result.found) {
        const nodes = result.path.filter("node").toArray();
        if (!bestPath || nodes.length < bestPath.length) {
          bestPath = nodes;
        }
      }
    });
    const fallback = bestPath && bestPath.length ? bestPath : [targetNode];
    return fallback.map((node) => this.formatNodeInfo(node));
  }

  formatNodeInfo(node) {
    if (!node) return { id: "", type: "", display: "", secondary: "" };
    const type = (node.data("type") || "").toLowerCase();
    const fullName = node.data("full_name") || node.data("label") || node.id();
    const display = type === "table" ? fullName : node.data("label") || node.id();
    let secondary = "";
    if (type === "table") {
      const short = node.data("label");
      if (short && short !== display) secondary = short;
    } else {
      secondary = node.data("sub_label") || node.data("job_id") || "";
    }
    return { id: node.id(), type, display, secondary };
  }

  formatPathPreview(nodes) {
    if (!nodes || !nodes.length) return "No lineage path available.";
    const labels = nodes.map((node) => node.display || node.id);
    if (labels.length <= 5) {
      return labels.join(" \u2192 ");
    }
    const first = labels[0];
    const second = labels[1];
    const penultimate = labels[labels.length - 2];
    const last = labels[labels.length - 1];
    return `${first} \u2192 ${second} \u2192 … \u2192 ${penultimate} \u2192 ${last}`;
  }

  updateLineageView(state) {
    const data = state || this.createEmptyLineageState();
    if (this.lineageUI.pathPreview) this.lineageUI.pathPreview.textContent = data.pathPreview;
    if (this.lineageUI.pathButton) this.lineageUI.pathButton.disabled = data.pathNodes.length <= 1;
    if (this.lineageUI.rootSummary) this.lineageUI.rootSummary.textContent = String(data.rootTables.length);
    if (this.lineageUI.rootButton) this.lineageUI.rootButton.disabled = !data.rootTables.length;
    if (this.lineageUI.leafSummary) this.lineageUI.leafSummary.textContent = String(data.leafTables.length);
    if (this.lineageUI.leafButton) this.lineageUI.leafButton.disabled = !data.leafTables.length;
    if (this.lineageUI.upstreamSummary)
      this.lineageUI.upstreamSummary.innerHTML = `Tables: ${data.upstream.tables}<br>Jobs: ${data.upstream.jobs}`;
    if (this.lineageUI.downstreamSummary)
      this.lineageUI.downstreamSummary.innerHTML = `Tables: ${data.downstream.tables}<br>Jobs: ${data.downstream.jobs}`;
    if (this.lineageUI.depthSummary)
      this.lineageUI.depthSummary.innerHTML = `Upstream: ${data.depth.upstream}<br>Downstream: ${data.depth.downstream}`;
  }

  openLineageDrawer(mode) {
    if (!this.lineageState) return;
    if (mode === "path") {
      if (!this.lineageState.pathNodes || this.lineageState.pathNodes.length <= 1) return;
      this.openPathDrawer();
      return;
    }
    if (mode === "root") {
      if (!this.lineageState.rootTables.length) return;
      this.openListDrawer(this.lineageState.rootTables, "Root tables", "No root tables found.");
      return;
    }
    if (mode === "leaf") {
      if (!this.lineageState.leafTables.length) return;
      this.openListDrawer(this.lineageState.leafTables, "Leaf tables", "No leaf tables found.");
    }
  }

  openPathDrawer() {
    const section = document.createElement("div");
    section.className = "drawer-section";
    const list = document.createElement("ol");
    list.className = "drawer-path";
    this.lineageState.pathNodes.forEach((node, index) => {
      const item = document.createElement("li");
      const chip = document.createElement("span");
      chip.className = `drawer-chip ${node.type}`;
      chip.textContent = node.type === "job" ? "JOB" : "TABLE";
      const line = document.createElement("div");
      line.className = "drawer-line";
      const primary = document.createElement("div");
      primary.className = "drawer-primary";
      primary.textContent = node.display;
      line.appendChild(primary);
      if (node.secondary) {
        const secondary = document.createElement("div");
        secondary.className = "drawer-secondary";
        secondary.textContent = node.secondary;
        line.appendChild(secondary);
      }
      item.setAttribute("data-index", String(index));
      item.append(chip, line);
      list.appendChild(item);
    });
    section.appendChild(list);
    this.showDrawer({
      title: "Full lineage path",
      subtitle: `${this.lineageState.pathNodes.length} nodes`,
      content: section,
    });
  }

  openListDrawer(items, title, emptyText) {
    const section = document.createElement("div");
    section.className = "drawer-section";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "drawer-search";
    search.placeholder = "Filter by name…";
    const list = document.createElement("ul");
    list.className = "drawer-list";
    const render = (query = "") => {
      const normalized = query.trim().toLowerCase();
      const filtered = normalized
        ? items.filter((item) => {
            const haystack = `${item.display} ${item.secondary || ""}`.toLowerCase();
            return haystack.includes(normalized);
          })
        : items;
      if (!filtered.length) {
        list.innerHTML = `<li class="empty">${emptyText}</li>`;
        return;
      }
      list.innerHTML = "";
      filtered.forEach((item) => {
        const row = document.createElement("li");
        const chip = document.createElement("span");
        chip.className = `drawer-chip ${item.type}`;
        chip.textContent = item.type === "job" ? "JOB" : "TABLE";
        const line = document.createElement("div");
        line.className = "drawer-line";
        const primary = document.createElement("div");
        primary.className = "drawer-primary";
        primary.textContent = item.display;
        line.appendChild(primary);
        if (item.secondary) {
          const secondary = document.createElement("div");
          secondary.className = "drawer-secondary";
          secondary.textContent = item.secondary;
          line.appendChild(secondary);
        }
        row.append(chip, line);
        list.appendChild(row);
      });
    };
    search.addEventListener("input", () => render(search.value));
    render();
    section.append(search, list);
    this.showDrawer({ title, subtitle: `${items.length} items`, content: section });
  }

  closeLineageDrawer() {
    if (!this.lineageUI.drawer) return;
    this.lineageUI.drawer.classList.remove("open");
    this.lineageUI.drawer.hidden = true;
  }

  showDrawer({ title, subtitle, content }) {
    const drawer = this.lineageUI.drawer;
    if (!drawer) return;
    if (this.lineageUI.drawerTitle) this.lineageUI.drawerTitle.textContent = title || "";
    if (this.lineageUI.drawerSubtitle) this.lineageUI.drawerSubtitle.textContent = subtitle || "";
    if (this.lineageUI.drawerBody) {
      this.lineageUI.drawerBody.innerHTML = "";
      if (content instanceof HTMLElement) this.lineageUI.drawerBody.appendChild(content);
      else if (typeof content === "string") this.lineageUI.drawerBody.innerHTML = content;
    }
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("open"));
  }

  isTableNode(node) {
    if (!node) return false;
    return String(node.data("type") || "").toLowerCase() === "table";
  }

  isJobNode(node) {
    if (!node) return false;
    return String(node.data("type") || "").toLowerCase() === "job";
  }

  showStatus(message, visible = true) {
    if (!this.elements.status || !this.elements.statusText) return;
    this.elements.statusText.textContent = message;
    this.elements.status.hidden = !visible;
  }
}

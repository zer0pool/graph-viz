import { RelationState } from "../state.js";

export class PanelController {
  constructor(apiClient) {
    this.api = apiClient;
    this.relations = new RelationState();
    this.elements = {
      title: document.getElementById("node-title"),
      badge: document.getElementById("node-type-badge"),
      jobSection: document.getElementById("job-details"),
      jobLabel: document.getElementById("job-label"),
      tableSection: document.getElementById("table-details"),
      tableFullName: document.getElementById("table-full-name"),
      tableSchema: document.getElementById("table-schema"),
      tableRows: document.getElementById("table-rows"),
      tableCreated: document.getElementById("table-created"),
      loadTableBody: document.getElementById("table-loads-body"),
      jobRunBody: document.getElementById("job-runs-body"),
      triggerSection: document.getElementById("trigger-section"),
      triggerContainer: document.getElementById("node-triggers"),
      status: document.getElementById("graph-status"),
      statusText: document.getElementById("graph-status-text"),
    };
    this.activeTabs = { table: "schema", job: "runs" };
    this.currentTable = null;
    this.currentJob = null;
    this.isLoadHistoryLoading = false;
    this.isJobRunLoading = false;
    this.setPlaceholder();
    this.bindDetailTabEvents();
  }

  setPlaceholder() {
    if (this.elements.title) this.elements.title.textContent = "Search the graph";
    if (this.elements.badge) {
      this.elements.badge.textContent = "-";
      this.elements.badge.classList.add("muted");
    }
    this.showJobSection(false);
    this.showTableSection(false);
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = true;
    this.setLoadHistoryPlaceholder("No load history available.");
    this.setJobRunPlaceholder("Select a job to view run history.");
    if (this.elements.jobLabel) this.elements.jobLabel.textContent = "Select a node to view its details.";
    this.currentTable = null;
    this.currentJob = null;
    this.activeTabs.table = "schema";
    this.activeTabs.job = "runs";
    this.isLoadHistoryLoading = false;
    this.isJobRunLoading = false;
  }

  updateMetadata(node) {
    if (!node) return;
    const rawType = (node.data("type") || "").toLowerCase();
    const looksLikeTable = rawType === "table" || Boolean(node.data("full_name"));
    const type = looksLikeTable ? "table" : "job";
    if (this.elements.title) this.elements.title.textContent = node.data("label") || node.id();
    if (this.elements.badge) {
      this.elements.badge.textContent = type === "table" ? "TABLE" : "JOB";
      this.elements.badge.classList.remove("muted");
    }
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
    this.showTableSection(false);
    if (this.elements.jobLabel) this.elements.jobLabel.textContent = node.data("label") || node.id();
    this.showJobSection(true);
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = true;
    this.currentTable = null;
    this.currentJob = node.data("job_id") || node.id();
    this.isJobRunLoading = false;
    this.setJobRunPlaceholder('Select "Run history" tab to load data.');
    if (this.activeTabs.job === "runs" && this.currentJob) {
      this.fetchJobRunHistory(true);
    }
  }

  renderTableDetails(node) {
    this.showJobSection(false);
    this.showTableSection(true);
    this.currentJob = null;
    this.currentTable = node.data("full_name") || node.data("label") || null;
    this.isLoadHistoryLoading = false;
    const schema = node.data("schema") || node.data("dataset") || node.data("namespace") || "-";
    const rows = node.data("rows") || node.data("row_count") || node.data("records") || "-";
    const created = node.data("created_at") || node.data("created") || node.data("updated_at") || "-";
    if (this.elements.tableFullName) this.elements.tableFullName.textContent = node.data("full_name") || node.data("label") || "-";
    if (this.elements.tableSchema) this.elements.tableSchema.textContent = schema;
    if (this.elements.tableRows) this.elements.tableRows.textContent = rows;
    if (this.elements.tableCreated) this.elements.tableCreated.textContent = created;
    if (this.activeTabs.table === "loads" && this.currentTable) {
      this.fetchLoadTimeline(true);
    } else {
      this.setLoadHistoryPlaceholder('Select "Load timeline" tab to load history.');
    }
  }

  showJobSection(visible) {
    if (this.elements.jobSection) this.elements.jobSection.hidden = !visible;
    const tabs = document.getElementById("job_tabs");
    const panels = document.querySelector('.detail-tab-panels[data-tab-group="job"]');
    if (tabs) tabs.hidden = !visible;
    if (panels) panels.hidden = !visible;
  }

  showTableSection(visible) {
    if (this.elements.tableSection) this.elements.tableSection.hidden = !visible;
    const tabs = document.getElementById("table_tabs");
    const panels = document.querySelector('.detail-tab-panels[data-tab-group="table"]');
    if (tabs) tabs.hidden = !visible;
    if (panels) panels.hidden = !visible;
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = !visible;
  }

  bindDetailTabEvents() {
    document.addEventListener("detail-tabs:changed", (event) => {
      const group = event.detail?.group || "table";
      const tab = event.detail?.tab || "schema";
      this.activeTabs[group] = tab;
      if (group === "table" && tab === "loads" && this.currentTable) {
        this.fetchLoadTimeline();
      } else if (group === "job" && tab === "runs" && this.currentJob) {
        this.fetchJobRunHistory();
      }
    });
  }

  setLoadHistoryPlaceholder(message, loading = false) {
    if (!this.elements.loadTableBody) return;
    const spinner = loading ? '<span class="spinner"></span>' : "";
    this.elements.loadTableBody.innerHTML = `<tr><td class="loading-cell" colspan="7">${spinner}${message}</td></tr>`;
  }

  setJobRunPlaceholder(message, loading = false) {
    if (!this.elements.jobRunBody) return;
    const spinner = loading ? '<span class="spinner"></span>' : "";
    this.elements.jobRunBody.innerHTML = `<tr><td class="loading-cell" colspan="6">${spinner}${message}</td></tr>`;
  }

  async fetchLoadTimeline(force = false) {
    if (!this.currentTable || !this.elements.loadTableBody) return;
    if (this.isLoadHistoryLoading && !force) return;
    this.isLoadHistoryLoading = true;
    this.setLoadHistoryPlaceholder("Loading load timeline…", true);
    const started = Date.now();
    try {
      const payload = await this.api.fetchTableLoadHistory(this.currentTable);
      const elapsed = Date.now() - started;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      if (payload.status !== "success") throw new Error("load history failed");
      const rows = Array.isArray(payload.result?.timeline) ? payload.result.timeline : [];
      this.renderLoadTimeline(rows);
    } catch (err) {
      this.setLoadHistoryPlaceholder("Failed to load timeline.");
    } finally {
      this.isLoadHistoryLoading = false;
    }
  }

  renderLoadTimeline(rows) {
    if (!this.elements.loadTableBody) return;
    if (!rows.length) {
      this.setLoadHistoryPlaceholder("No load history available.");
      return;
    }
    this.elements.loadTableBody.innerHTML = rows
      .map((entry, index) => {
        const run = entry.run_id || entry.run || `#${index + 1}`;
        const status = entry.status || "-";
        const duration =
          typeof entry.duration_sec === "number" ? `${entry.duration_sec}s` : entry.duration || entry.elapsed || "-";
        const updated = entry.updated_at || entry.completed_at || "-";
        const intervalStart = entry.data_interval_start || "-";
        const intervalEnd = entry.data_interval_end || "-";
        const interval = entry.interval || "-";
        return `<tr>
          <td>${run}</td>
          <td>${status}</td>
          <td>${duration}</td>
          <td>${updated}</td>
          <td>${intervalStart}</td>
          <td>${intervalEnd}</td>
          <td>${interval}</td>
        </tr>`;
      })
      .join("");
  }

  async fetchJobRunHistory(force = false) {
    if (!this.currentJob || !this.elements.jobRunBody) return;
    if (this.isJobRunLoading && !force) return;
    this.isJobRunLoading = true;
    this.setJobRunPlaceholder("Loading run history…", true);
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
      this.setJobRunPlaceholder("Failed to load run history.");
    } finally {
      this.isJobRunLoading = false;
    }
  }

  renderJobRunHistory(rows) {
    if (!this.elements.jobRunBody) return;
    if (!rows.length) {
      this.setJobRunPlaceholder("No run history available.");
      return;
    }
    this.elements.jobRunBody.innerHTML = rows
      .map((entry, index) => {
        const run = entry.run_id || entry.run || `#${index + 1}`;
        const status = entry.status || "-";
        const start = entry.start_time || "-";
        const end = entry.end_time || "-";
        const duration =
          typeof entry.duration_sec === "number" ? `${entry.duration_sec}s` : entry.duration || entry.elapsed || "-";
        const triggeredBy = entry.triggered_by || entry.source_job || "-";
        return `<tr>
          <td>${run}</td>
          <td>${status}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${duration}</td>
          <td>${triggeredBy}</td>
        </tr>`;
      })
      .join("");
  }

  showStatus(message, visible = true) {
    if (!this.elements.status || !this.elements.statusText) return;
    this.elements.statusText.textContent = message;
    this.elements.status.hidden = !visible;
  }
}

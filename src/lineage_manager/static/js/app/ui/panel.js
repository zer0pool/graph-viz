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
      schema: document.getElementById("table-schema"),
      rows: document.getElementById("table-rows"),
      created: document.getElementById("table-created"),
      loadsBody: document.getElementById("table-loads-body"),
    });
    this.timelinessView = new TableTimelinessView({
      pane: document.getElementById("timeliness-pane"),
      dailyChart: document.getElementById("timeliness-daily-chart"),
      hourlyChart: document.getElementById("timeliness-hourly-chart"),
      dailyPlaceholder: document.getElementById("timeliness-daily-placeholder"),
      hourlyPlaceholder: document.getElementById("timeliness-hourly-placeholder"),
      hourlyLabel: document.getElementById("timeliness-hourly-label"),
    });
    this.activeTabs = { table: "schema", job: "runs" };
    this.currentTable = null;
    this.currentJob = null;
    this.isLoadHistoryLoading = false;
    this.isJobRunLoading = false;
    this.timelinessData = null;
    this.selectedTimelinessDay = null;
    this.isTimelinessLoading = false;
    this.setPlaceholder();
    this.bindDetailTabEvents();
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
    this.tableView.setLoadPlaceholder("No load history available.");
    this.jobView.setRunsPlaceholder("Select a job to view run history.");
    this.jobView.setLabel("Select a node to view its details.");
    this.currentTable = null;
    this.currentJob = null;
    this.activeTabs.table = "schema";
    this.activeTabs.job = "runs";
    this.isLoadHistoryLoading = false;
    this.isJobRunLoading = false;
    this.resetTimelinessState();
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
    this.isLoadHistoryLoading = false;
    this.resetTimelinessState('Select "Load timeline v2" tab to load timeliness data.');
    const schema = node.data("schema") || node.data("dataset") || node.data("namespace") || "-";
    const rows = node.data("rows") || node.data("row_count") || node.data("records") || "-";
    const created = node.data("created_at") || node.data("created") || node.data("updated_at") || "-";
    this.tableView.setMetadata({
      fullName: node.data("full_name") || node.data("label") || "-",
      schema,
      rows,
      created,
    });
    if (this.activeTabs.table === "loads" && this.currentTable) {
      this.fetchLoadTimeline(true);
    } else {
      this.tableView.setLoadPlaceholder('Select "Load timeline" tab to load history.');
    }
    if (this.activeTabs.table === "timeliness" && this.currentTable) {
      this.fetchTimeliness(true);
    }
  }

  bindDetailTabEvents() {
    document.addEventListener("detail-tabs:changed", (event) => {
      const group = event.detail?.group || "table";
      const tab = event.detail?.tab || "schema";
      this.activeTabs[group] = tab;
      if (group === "table" && tab === "loads" && this.currentTable) {
        this.fetchLoadTimeline();
      } else if (group === "table" && tab === "timeliness") {
        this.timelinessView.resize();
        if (this.currentTable) this.fetchTimeliness();
        else this.timelinessView.setIdle('Select a table to view timeliness data.');
      } else if (group === "job" && tab === "runs" && this.currentJob) {
        this.fetchJobRunHistory();
      }
    });
  }

  async fetchLoadTimeline(force = false) {
    if (!this.currentTable) return;
    if (this.isLoadHistoryLoading && !force) return;
    this.isLoadHistoryLoading = true;
    this.tableView.setLoadPlaceholder("Loading load timeline…", true);
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
      this.tableView.setLoadPlaceholder("Failed to load timeline.");
    } finally {
      this.isLoadHistoryLoading = false;
    }
  }

  resetTimelinessState(message) {
    this.timelinessData = null;
    this.selectedTimelinessDay = null;
    this.isTimelinessLoading = false;
    if (this.timelinessView) {
      this.timelinessView.reset(message || 'Select "Load timeline v2" tab to load timeliness data.');
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

  renderLoadTimeline(rows) {
    if (!rows.length) {
      this.tableView.setLoadPlaceholder("No load history available.");
      return;
    }
    this.tableView.renderLoadHistory(rows);
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

  showStatus(message, visible = true) {
    if (!this.elements.status || !this.elements.statusText) return;
    this.elements.statusText.textContent = message;
    this.elements.status.hidden = !visible;
  }
}

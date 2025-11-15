import { RelationState } from "../state.js";

export class PanelController {
  constructor(apiClient) {
    this.api = apiClient;
    this.relations = new RelationState();
    this.elements = {
      title: document.getElementById("node-title"),
      subtitle: document.getElementById("node-subtitle"),
      badge: document.getElementById("node-type-badge"),
      upstream: document.getElementById("upstream-list"),
      downstream: document.getElementById("downstream-list"),
      upstreamMore: document.getElementById("upstream-more"),
      downstreamMore: document.getElementById("downstream-more"),
      owner: document.getElementById("meta-owner"),
      description: document.getElementById("meta-description"),
      updated: document.getElementById("meta-updated"),
      triggerSection: document.getElementById("trigger-section"),
      triggerContainer: document.getElementById("node-triggers"),
      status: document.getElementById("graph-status"),
      statusText: document.getElementById("graph-status-text"),
    };
    this.bindRelationButtons();
    this.setPlaceholder();
  }

  bindRelationButtons() {
    this.elements.upstreamMore?.addEventListener("click", () => this.showRelation("upstream"));
    this.elements.downstreamMore?.addEventListener("click", () => this.showRelation("downstream"));
  }

  showRelation(kind) {
    const items = this.relations.get(kind);
    if (!items.length) return;
    alert(items.join("\n"));
  }

  setPlaceholder() {
    this.elements.title.textContent = "Search the graph";
    this.elements.subtitle.textContent = "Select a node to view its details.";
    this.elements.badge.textContent = "No node";
    this.elements.badge.classList.add("muted");
    this.renderList(this.elements.upstream, [], this.elements.upstreamMore);
    this.renderList(this.elements.downstream, [], this.elements.downstreamMore);
    this.elements.owner.textContent = "-";
    this.elements.description.textContent = "-";
    this.elements.updated.textContent = "-";
    if (this.elements.triggerSection) this.elements.triggerSection.hidden = true;
  }

  renderList(listEl, items, moreBtn) {
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = "<li>Select a node to view data.</li>";
      listEl.classList.add("empty");
      if (moreBtn) moreBtn.hidden = true;
      return;
    }
    listEl.classList.remove("empty");
    const limit = 5;
    items.slice(0, limit).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      listEl.appendChild(li);
    });
    const extra = items.length - limit;
    if (moreBtn) {
      moreBtn.hidden = extra <= 0;
      if (extra > 0) moreBtn.textContent = `+${extra} more`;
    }
  }

  updateMetadata(node) {
    this.elements.title.textContent = node.data("label") || node.id();
    this.elements.subtitle.textContent = node.data("full_name") || node.data("job_id") || "";
    this.elements.badge.textContent = node.data("type") || "job";
    this.elements.badge.classList.remove("muted");
    this.elements.owner.textContent = node.data("owner") || "Unassigned";
    this.elements.description.textContent = node.data("description") || "-";
    this.elements.updated.textContent = node.data("updated_at") || node.data("updated") || "-";
  }

  updateRelations(node) {
    const upstream = node.incomers("node").map((x) => x.data("label"));
    const downstream = node.outgoers("node").map((x) => x.data("label"));
    this.relations.set(upstream, downstream);
    this.renderList(this.elements.upstream, upstream, this.elements.upstreamMore);
    this.renderList(this.elements.downstream, downstream, this.elements.downstreamMore);
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

  showStatus(message, visible = true) {
    if (!this.elements.status || !this.elements.statusText) return;
    this.elements.statusText.textContent = message;
    this.elements.status.hidden = !visible;
  }
}

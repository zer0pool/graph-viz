/**
 * TriggerManager - Handle table trigger (job consumer) UI and API calls
 * Extracted from PanelController (~80 lines)
 * Responsibilities: render trigger UI, handle toggle/bulk operations, sync state
 */

export class TriggerManager {
    constructor(api) {
        this.api = api;
        this.section = document.getElementById("trigger-section");
        this.container = document.getElementById("node-triggers");
    }

    /**
     * Render triggers for a table node
     */
    async render(node) {
        if (!node || (node.data("type") || "") !== "table") {
            this.hide();
            return;
        }

        const tableName = node.data("full_name") || node.data("label");
        this.show(true); // loading state

        try {
            const payload = await this.api.fetchTableTriggers(tableName);
            if (payload.status !== "success") {
                throw new Error("trigger data invalid");
            }

            const jobs = payload.jobs || [];
            this.renderTriggerTable(jobs, tableName);
        } catch (err) {
            this.container.textContent = "Failed to load triggers";
        }
    }

    /**
     * Render trigger table HTML
     */
    renderTriggerTable(jobs, tableName) {
        if (!this.container) return;

        if (!jobs.length) {
            this.container.innerHTML = '<div class="badge-off">No consumers</div>';
            return;
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
        </div>
      `
            )
            .join("");

        this.container.innerHTML = `
      <div class="trigger-head">
        <span>Trigger Jobs</span>
        <button class="btn-pill danger" id="bulk-off">⛔ All OFF</button>
      </div>
      ${rows}
    `;

        this.bindEvents(tableName);
    }

    /**
     * Bind event handlers
     */
    bindEvents(tableName) {
        if (!this.container) return;

        // Individual toggle events
        this.container.querySelectorAll(".trigger-toggle").forEach((el) => {
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
                    this.syncBulkButton();
                } catch (err) {
                    alert("Failed to update trigger");
                    el.checked = !want;
                }
            });
        });

        // Bulk OFF button
        const bulkBtn = this.container.querySelector("#bulk-off");
        if (bulkBtn) {
            this.syncBulkButton();
            bulkBtn.addEventListener("click", async () => {
                if (!window.confirm("Turn OFF all triggers?")) return;

                try {
                    await this.api.bulkDisableTriggers(tableName);
                    this.container.querySelectorAll(".trigger-toggle").forEach((el) => (el.checked = false));
                    this.syncBulkButton();
                } catch (err) {
                    alert("Bulk OFF failed");
                }
            });
        }
    }

    /**
     * Sync bulk button state
     */
    syncBulkButton() {
        const bulkBtn = this.container?.querySelector("#bulk-off");
        if (!bulkBtn) return;

        const anyOn = Array.from(this.container.querySelectorAll(".trigger-toggle")).some(
            (chk) => chk.checked
        );
        bulkBtn.disabled = !anyOn;
    }

    /**
     * Show trigger section
     */
    show(isLoading = false) {
        if (!this.section) return;
        this.section.hidden = false;

        if (isLoading && this.container) {
            this.container.textContent = "Loading…";
        }
    }

    /**
     * Hide trigger section
     */
    hide() {
        if (!this.section) return;
        this.section.hidden = true;
    }
}

export default TriggerManager;

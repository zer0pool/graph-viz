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
     * Render trigger table HTML (read-only view for Table Detail Panel)
     */
    renderTriggerTable(jobs, tableName) {
        if (!this.container) return;

        if (!jobs.length) {
            this.container.innerHTML = '<div class="badge-off">No consumers</div>';
            return;
        }

        const rows = jobs
            .map((job) => {
                const depType = job.dependency_type || "SOFT";
                const isHard = depType === "HARD";

                const icon = isHard ? "⏳" : "🔗";
                const statusText = isHard
                    ? "Waits for data from this table"
                    : "Reads this table (no wait)";
                const tooltip = isHard
                    ? "This job periodically checks this table and starts only when new data is available."
                    : "This job runs on schedule without waiting for data in this table.";

                return `
        <div class="trigger-row-readonly">
          <div class="trigger-job-name">${job.name || job.job_id}</div>
          <div class="trigger-status" data-tooltip="${tooltip}">
            <span class="trigger-icon">${icon}</span>
            <span class="trigger-text">${statusText}</span>
          </div>
          <button class="link-btn view-job-btn" data-job-id="${job.job_id}">View Job →</button>
        </div>
      `;
            })
            .join("");

        this.container.innerHTML = rows;
        this.bindViewJobButtons();
        this.show(); // Ensure section is visible after rendering
    }

    /**
     * Bind "View Job" button events
     */
    bindViewJobButtons() {
        if (!this.container) return;

        this.container.querySelectorAll(".view-job-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const jobId = e.currentTarget.getAttribute("data-job-id");
                if (jobId) {
                    // Dispatch event to select the job node in the graph
                    document.dispatchEvent(new CustomEvent("job-detail:view-in-graph", {
                        detail: { nodeId: `job:${jobId}` }
                    }));
                }
            });
        });
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
                const wantHard = el.checked;
                const depType = wantHard ? "HARD" : "SOFT";
                const ok = window.confirm(`Change dependency to ${depType} for ${jobId}?`);

                if (!ok) {
                    el.checked = !wantHard;
                    return;
                }

                try {
                    await this.api.patchTableTrigger(tableName, jobId, depType);
                    this.updateDepLabel(el, depType);
                } catch (err) {
                    alert("Failed to update dependency");
                    el.checked = !wantHard;
                }
            });
        });

        // Bulk SOFT button
        const bulkBtn = this.container.querySelector("#bulk-soft");
        if (bulkBtn) {
            this.syncBulkButton();
            bulkBtn.addEventListener("click", async () => {
                if (!window.confirm("Set all dependencies to SOFT?")) return;

                try {
                    await this.api.bulkDisableTriggers(tableName);
                    this.container.querySelectorAll(".trigger-toggle").forEach((el) => {
                        el.checked = false;
                        this.updateDepLabel(el, "SOFT");
                    });
                    this.syncBulkButton();
                } catch (err) {
                    alert("Bulk SOFT failed");
                }
            });
        }
    }

    /**
     * Update dependency label next to toggle
     */
    updateDepLabel(toggleEl, depType) {
        const row = toggleEl.closest(".trigger-row");
        if (!row) return;
        const label = row.querySelector(".dep-label");
        if (label) {
            label.textContent = depType;
            label.className = `dep-label dep-${depType.toLowerCase()}`;
        }
    }

    /**
     * Sync bulk button state
     */
    syncBulkButton() {
        const bulkBtn = this.container?.querySelector("#bulk-soft");
        if (!bulkBtn) return;

        const anyHard = Array.from(this.container.querySelectorAll(".trigger-toggle")).some(
            (chk) => chk.checked
        );
        bulkBtn.disabled = !anyHard;
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

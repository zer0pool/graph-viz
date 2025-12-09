/**
 * JobDetailView - Render job overview, run history, and lineage summaries
 */

export class JobDetailView {
    constructor({
        section,
        label,
        tabs,
        panels,
        runsBody,
        runsTimeline,
        runDrawer,
        runDrawerFields,
        runDrawerSubtitle,
        runDrawerClose,
        overviewPlaceholder,
        overviewContent,
        overviewFields = {},
        inputList,
        outputList,
        lineagePlaceholder,
        lineageContent,
        lineageInputs,
        lineageOutputs,
    }) {
        this.section = section;
        this.label = label;
        this.tabs = tabs;
        this.panels = panels;
        this.runsBody = runsBody;
        this.runsTimeline = runsTimeline;
        this.runDrawer = runDrawer;
        this.runDrawerFields = runDrawerFields;
        this.runDrawerSubtitle = runDrawerSubtitle;
        this.runDrawerClose = runDrawerClose;
        this.sumRunning = null;
        this.sumSuccess = null;
        this.sumFailed = null;
        this.sumSkipped = null;
        this.sumTotal = null;

        // accept optional summary elements from constructor args
        if (arguments[0]) {
            this.sumRunning = arguments[0].sumRunning || null;
            this.sumSuccess = arguments[0].sumSuccess || null;
            this.sumFailed = arguments[0].sumFailed || null;
            this.sumSkipped = arguments[0].sumSkipped || null;
            this.sumTotal = arguments[0].sumTotal || null;
        }
        this.latestRuns = [];

        this.overviewPlaceholder = overviewPlaceholder;
        this.overviewContent = overviewContent;
        this.overviewFields = overviewFields;
        this.inputList = inputList;
        this.outputList = outputList;

        this.lineagePlaceholder = lineagePlaceholder;
        this.lineageContent = lineageContent;
        this.lineageInputs = lineageInputs;
        this.lineageOutputs = lineageOutputs;

        this.collapseState = {};

        this.bindRunDrawer();
    }

    show() {
        this.toggle(true);
    }

    hide() {
        this.toggle(false);
    }

    toggle(visible) {
        if (this.section) {
            this.section.hidden = !visible;
            this.section.style.display = visible ? "" : "none";
        }
        if (this.tabs) this.tabs.hidden = !visible;
        if (this.panels) this.panels.hidden = !visible;
    }

    reset() {
        this.collapseState = {};
        this.setOverviewPlaceholder("Select a job to load overview.");
        this.renderIOLinks([], []);
        this.setLineagePlaceholder('Select "Lineage" to view related tables.');
        this.setRunsPlaceholder('Select "Run history" to load data.');
        this.setTimelinePlaceholder('Select "Run history" to load data.');
    }

    setLabel(text, visible = true) {
        if (!this.label) return;
        this.label.textContent = text || "";
        this.label.hidden = !visible;
    }

    setOverviewPlaceholder(message) {
        if (this.overviewPlaceholder) {
            this.overviewPlaceholder.textContent = message;
            this.overviewPlaceholder.hidden = false;
        }
        if (this.overviewContent) this.overviewContent.hidden = true;
    }

    setOverviewLoading(message = "Loading job details…") {
        this.setOverviewPlaceholder(message);
    }

    setOverviewError(message = "Failed to load job details.") {
        this.setOverviewPlaceholder(message);
    }

    renderOverview(detail = {}) {
        if (!this.overviewContent) return;
        if (this.overviewPlaceholder) this.overviewPlaceholder.hidden = true;
        this.overviewContent.hidden = false;

        const fields = this.overviewFields || {};
        this.setField(fields.status, detail.status || "-");
        this.setField(fields.schedule, detail.schedule || "-");
        this.setField(fields.owner, detail.owner || "-");
        this.setField(fields.destination, detail.destination || "-");
        this.setField(fields.mode, detail.write_mode || "-");
    }

    setField(node, value) {
        if (node) node.textContent = value ?? "-";
    }

    renderIOLinks(inputs = [], outputs = []) {
        this.renderList(this.inputList, inputs, "No input tables detected.", "overview_inputs");
        this.renderList(this.outputList, outputs, "No output tables detected.", "overview_outputs");
    }

    setLineagePlaceholder(message) {
        if (this.lineagePlaceholder) {
            this.lineagePlaceholder.textContent = message;
            this.lineagePlaceholder.hidden = false;
        }
        if (this.lineageContent) this.lineageContent.hidden = true;
    }

    renderLineageSummary(inputs = [], outputs = []) {
        if (!this.lineageContent) return;
        if (!inputs.length && !outputs.length) {
            this.setLineagePlaceholder("No lineage information available.");
            return;
        }
        if (this.lineagePlaceholder) this.lineagePlaceholder.hidden = true;
        this.lineageContent.hidden = false;
        this.renderList(this.lineageInputs, inputs, "No input tables detected.", "lineage_inputs");
        this.renderList(this.lineageOutputs, outputs, "No output tables detected.", "lineage_outputs");
    }

    renderList(target, items = [], emptyText = "No items", key, collapsible = true) {
        if (!target) return;
        if (!items.length) {
            target.innerHTML = `<li class="empty">${emptyText}</li>`;
            return;
        }

        const threshold = 3;
        const isCollapsible = collapsible && items.length > threshold;
        const expanded = this.collapseState[key] || false;
        const visibleItems = !isCollapsible || expanded ? items : items.slice(0, threshold);

        target.innerHTML = visibleItems
            .map((entry) => {
                const item = typeof entry === "string" ? { label: entry } : entry || {};
                const primary = this.extractPrimaryLabel(item);
                const secondary = this.extractSecondaryLabel(item, primary);
                const meta = secondary ? `<div class="secondary">${secondary}</div>` : "";
                return `<li>
                    <div class="primary">${primary}</div>
                    ${meta}
                </li>`;
            })
            .join("");

        if (isCollapsible) {
            const remaining = items.length - threshold;
            const label = expanded ? "Hide tables" : `+ ${remaining} more tables…`;
            const toggle = document.createElement("li");
            toggle.className = "io-toggle";
            toggle.innerHTML = `<button type="button">${label}</button>`;
            toggle.querySelector("button").addEventListener("click", () => {
                this.collapseState[key] = !expanded;
                this.renderList(target, items, emptyText, key, collapsible);
            });
            target.appendChild(toggle);
        }
    }

    extractPrimaryLabel(item = {}) {
        if (item.type === "s3") {
            return item.label || item.name || item.path || "-";
        }
        return item.full_name || item.label || item.name || "-";
    }

    extractSecondaryLabel(item = {}, primary) {
        const location =
            item.location ||
            item.storage_path ||
            item.external_path ||
            item.path ||
            null;
        if (location && location !== primary) {
            return location;
        }
        return null;
    }

    setRunsPlaceholder(message, loading = false) {
        if (!this.runsBody) return;
        const spinner = loading ? '<span class="spinner"></span>' : "";
        this.runsBody.innerHTML = `<tr><td class="loading-cell" colspan="4">${spinner}${message}</td></tr>`;
        this.setTimelinePlaceholder(message);
    }

    setTimelinePlaceholder(message) {
        if (!this.runsTimeline) return;
        this.runsTimeline.innerHTML = `<div class="timeline-placeholder">${message}</div>`;
    }

    formatDuration(sec) {
        if (sec === null || sec === undefined) return "-";
        const s = Number(sec);
        if (Number.isNaN(s) || s < 0) return "-";

        const d = Math.floor(s / 86400);
        let rem = s % 86400;
        const h = Math.floor(rem / 3600);
        rem = rem % 3600;
        const m = Math.floor(rem / 60);
        const secLeft = rem % 60;

        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        if (parts.length === 0 && secLeft > 0) parts.push(`${secLeft}s`);
        return parts.join(" ");
    }

    renderSummary(runs = []) {
        if (!Array.isArray(runs)) return;
        const sum = {
            running: runs.filter((r) => (r.status || "").toLowerCase() === "running").length,
            success: runs.filter((r) => (r.status || "").toLowerCase() === "success").length,
            failed: runs.filter((r) => (r.status || "").toLowerCase() === "failed").length,
            skipped: runs.filter((r) => (r.status || "").toLowerCase() === "skipped").length,
            total: runs.length,
        };
        if (this.sumRunning) this.sumRunning.textContent = sum.running;
        if (this.sumSuccess) this.sumSuccess.textContent = sum.success;
        if (this.sumFailed) this.sumFailed.textContent = sum.failed;
        if (this.sumSkipped) this.sumSkipped.textContent = sum.skipped;
        if (this.sumTotal) this.sumTotal.textContent = sum.total;
    }

    renderRuns(rows = []) {
        if (!this.runsBody) return;

        this.latestRuns = Array.isArray(rows) ? rows : [];
        this.renderTimeline(this.latestRuns);

        if (!this.latestRuns.length) {
            this.setRunsPlaceholder("No run history available.");
            return;
        }

        this.runsBody.innerHTML = this.latestRuns
            .map((entry, index) => {
                const status = (entry.status || "unknown").toLowerCase();
                const start = entry.start_time || "-";
                const durationRaw = entry.duration_sec != null ? entry.duration_sec : (entry.duration || entry.elapsed || null);
                const duration = durationRaw != null ? this.formatDuration(durationRaw) : "-";
                return `<tr data-run-idx="${index}">
                    <td><span class="status-pill status-${status}">${status}</span></td>
                    <td>${start}</td>
                    <td title="${durationRaw != null ? durationRaw + ' seconds' : ''}">${duration}</td>
                    <td><button type="button" class="link-btn view-run" data-run-idx="${index}">Details</button></td>
                </tr>`;
            })
            .join("");

        this.runsBody.querySelectorAll(".view-run").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const idx = Number(e.currentTarget.dataset.runIdx);
                const run = this.latestRuns[idx];
                if (run) this.openRunDrawer(run);
            });
        });
    }

    renderTimeline(runs = []) {
        if (!this.runsTimeline) return;
        if (!runs.length) {
            this.setTimelinePlaceholder("No run history available.");
            return;
        }

        const dots = runs
            .map((run, idx) => {
                const status = (run.status || "unknown").toLowerCase();
                const start = run.start_time || "-";
                const durationRaw = run.duration_sec != null ? run.duration_sec : (run.duration || run.elapsed || null);
                const duration = durationRaw != null ? this.formatDuration(durationRaw) : "-";
                const tooltip = `${start} • ${status}${duration ? ` • ${duration}` : ""}`;
                return `<button type="button" class="timeline-dot status-${status}" data-run-idx="${idx}" title="${tooltip}"></button>`;
            })
            .join("");

        this.runsTimeline.innerHTML = `<div class="timeline-track">${dots}</div>`;

        this.runsTimeline.querySelectorAll(".timeline-dot").forEach((dot) => {
            dot.addEventListener("click", (e) => {
                const idx = Number(e.currentTarget.dataset.runIdx);
                const run = this.latestRuns[idx];
                if (run) this.openRunDrawer(run);
            });
        });
    }

    bindRunDrawer() {
        if (this.runDrawerClose) {
            this.runDrawerClose.addEventListener("click", () => this.closeRunDrawer());
        }
        if (this.runDrawer) {
            this.runDrawer.addEventListener("click", (e) => {
                if (e.target === this.runDrawer) this.closeRunDrawer();
            });
        }
    }

    openRunDrawer(run = {}) {
        if (!this.runDrawer || !this.runDrawerFields) return;

        const safe = (v, fallback = "-") => (v === undefined || v === null || v === "" ? fallback : v);
        const status = (run.status || "unknown").toLowerCase();
        const fields = [
            { label: "Run ID", value: safe(run.run_id || run.run) },
            { label: "Status", value: status },
            { label: "Triggered by", value: safe(run.triggered_by || run.trigger || run.source_job) },
            { label: "Start", value: safe(run.start_time) },
            { label: "End", value: safe(run.end_time) },
            {
                label: "Duration",
                value: durationRaw != null ? this.formatDuration(durationRaw) : safe(run.duration || run.elapsed || "-", "-"),
            },
            { label: "Data interval end", value: safe(run.data_interval_end) },
        ];

        this.runDrawerFields.innerHTML = `<div class="run-detail-grid">
            ${fields
                .map(
                    (f) => `<div class="field">
                        <div class="label">${f.label}</div>
                        <div class="value">${f.value}</div>
                    </div>`
                )
                .join("")}
        </div>`;

        if (this.runDrawerSubtitle) {
            this.runDrawerSubtitle.textContent = safe(run.run_id || run.run || "");
        }

        this.runDrawer.hidden = false;
        this.runDrawer.classList.add("open");
    }

    closeRunDrawer() {
        if (!this.runDrawer) return;
        this.runDrawer.classList.remove("open");
        this.runDrawer.hidden = true;
    }
}

export default JobDetailView;

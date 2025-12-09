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
        runHistoryPagination,
        runHistoryPageLabel,
        runHistoryPrev,
        runHistoryNext,
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
        this.runHistoryPagination = runHistoryPagination;
        this.runHistoryPageLabel = runHistoryPageLabel;
        this.runHistoryPrev = runHistoryPrev;
        this.runHistoryNext = runHistoryNext;
        this.runHistoryPage = 0;
        this.runHistoryPageSize = 10;
        this.initPaginationControls();

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
        this.runHistoryPage = 0;
        this.renderRunsPage();
    }

    renderRunsPage() {
        if (!this.runsBody) return;

        if (!this.latestRuns.length) {
            this.setRunsPlaceholder("No run history available.");
            if (this.runHistoryPagination) this.runHistoryPagination.hidden = true;
            return;
        }

        const pageRuns = this.getPageRunsWithIndices();
        this.renderTimeline(pageRuns.map(({ run }) => run), pageRuns.map(({ index }) => index));
        this.runsBody.innerHTML = pageRuns
            .map(({ run, index }) => {
                const status = (run.status || "unknown").toLowerCase();
                const start = run.start_time || "-";
                const durationRaw =
                    run.duration_sec != null
                        ? run.duration_sec
                        : run.duration != null
                        ? run.duration
                        : run.elapsed;
                const duration = durationRaw != null ? this.formatDuration(durationRaw) : "-";
                return `<tr data-run-idx="${index}">
                    <td><span class="status-pill status-${status}">${status}</span></td>
                    <td>${start}</td>
                    <td title="${durationRaw != null ? `${durationRaw} seconds` : ""}">${duration}</td>
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

        this.renderPaginationControls();
    }

    initPaginationControls() {
        if (this.runHistoryPrev) {
            this.runHistoryPrev.addEventListener("click", () =>
                this.changeRunHistoryPage(this.runHistoryPage - 1)
            );
        }
        if (this.runHistoryNext) {
            this.runHistoryNext.addEventListener("click", () =>
                this.changeRunHistoryPage(this.runHistoryPage + 1)
            );
        }
    }

    changeRunHistoryPage(page) {
        const pageCount = this.getRunHistoryPageCount();
        const normalized = Math.min(Math.max(page, 0), pageCount - 1);
        if (normalized === this.runHistoryPage) return;
        this.runHistoryPage = normalized;
        this.renderRunsPage();
    }

    getRunHistoryPageCount() {
        if (!this.latestRuns.length) return 1;
        return Math.max(1, Math.ceil(this.latestRuns.length / this.runHistoryPageSize));
    }

    renderPaginationControls() {
        if (!this.runHistoryPagination) return;
        const pageCount = this.getRunHistoryPageCount();
        if (this.runHistoryPageLabel) {
            this.runHistoryPageLabel.textContent = `Page ${this.runHistoryPage + 1} of ${pageCount}`;
        }
        this.runHistoryPagination.hidden = pageCount <= 1;
        if (this.runHistoryPrev) {
            this.runHistoryPrev.disabled = this.runHistoryPage <= 0;
        }
        if (this.runHistoryNext) {
            this.runHistoryNext.disabled = this.runHistoryPage >= pageCount - 1;
        }
    }

    getPageRunsWithIndices() {
        const start = this.runHistoryPage * this.runHistoryPageSize;
        const slice = this.latestRuns.slice(start, start + this.runHistoryPageSize);
        return slice.map((run, idx) => ({ run, index: start + idx }));
    }

    renderTimeline(runs = [], globalIndices = []) {
        if (!this.runsTimeline) return;
        if (!runs.length) {
            this.setTimelinePlaceholder("No run history available.");
            return;
        }

        const points = this.calculateTimelinePoints(runs);

        this.runsTimeline.innerHTML = `
            <div class="timeline-track">
                <div class="timeline-track-line" aria-hidden="true"></div>
            </div>`;

        const track = this.runsTimeline.querySelector(".timeline-track");
        if (!track) return;

        points.forEach((point, idx) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `timeline-dot status-${point.severity}`;
            const globalIndex = Number.isFinite(globalIndices[idx]) ? globalIndices[idx] : idx;
            button.dataset.runIdx = globalIndex.toString();
            button.style.left = `${point.left.toFixed(2)}%`;
            button.title = point.tooltip;
            button.setAttribute("aria-label", point.tooltip);
            track.appendChild(button);
        });

        this.runsTimeline.querySelectorAll(".timeline-dot").forEach((dot) => {
            dot.addEventListener("click", (e) => {
                const idx = Number(e.currentTarget.dataset.runIdx);
                const run = this.latestRuns[idx];
                if (run) this.openRunDrawer(run);
            });
        });
    }

    calculateTimelinePoints(runs = []) {
        const totalRuns = runs.length;
        if (!totalRuns) return [];

        const entries = runs.map((run, idx) => {
            const timestamp = this.getRunTimestamp(run);
            return { run, timestamp, idx };
        });

        let minTime = Infinity;
        let maxTime = -Infinity;
        entries.forEach(({ timestamp }) => {
            if (timestamp != null) {
                minTime = Math.min(minTime, timestamp);
                maxTime = Math.max(maxTime, timestamp);
            }
        });

        const hasValidRange = minTime !== Infinity && maxTime !== -Infinity && maxTime > minTime;
        const range = hasValidRange ? maxTime - minTime : null;

        return entries.map(({ run, timestamp, idx }) => {
            const fallback = totalRuns > 1 ? (idx / (totalRuns - 1)) * 100 : 50;
            const rawLeft = hasValidRange && timestamp != null ? ((timestamp - minTime) / range) * 100 : fallback;
            const left = Math.min(Math.max(rawLeft, 0), 100);
            const stateValue = (run.state || run.status || "unknown").toLowerCase();
            const durationRaw = run.duration_sec != null ? run.duration_sec : (run.duration || run.elapsed || null);
            const durationLabel = durationRaw != null ? this.formatDuration(durationRaw) : null;
            const labelTime = run.start_time || run.data_interval_end || run.dag_run_id || "";
            const tooltipParts = [];
            if (labelTime) tooltipParts.push(labelTime);
            tooltipParts.push(stateValue);
            if (durationLabel) tooltipParts.push(`Duration: ${durationLabel}`);
            const tooltip = tooltipParts.join(" • ");
            return {
                run,
                left,
                severity: this.getTimelineSeverity(stateValue),
                tooltip,
            };
        });
    }

    getRunTimestamp(run = {}) {
        return (
            this.parseTimestamp(run.data_interval_end) ??
            this.extractTimestampFromDagRunId(run.dag_run_id) ??
            this.parseTimestamp(run.start_time) ??
            this.parseTimestamp(run.finish_time ?? run.end_time ?? null)
        );
    }

    parseTimestamp(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    extractTimestampFromDagRunId(dagRunId = "") {
        if (!dagRunId) return null;
        const match = dagRunId.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/);
        if (!match) return null;
        return this.parseTimestamp(match[0]);
    }

    getTimelineSeverity(status = "") {
        if (!status) return "unknown";
        if (/failed|error|cancelled/.test(status)) return "error";
        if (/warn|warning|delay|late|skipped|timeout/.test(status)) return "warning";
        if (/running|pending|queued|scheduled/.test(status)) return "running";
        if (/success|completed|done/.test(status)) return "success";
        return "unknown";
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
        const durationRaw =
            run.duration_sec != null
                ? run.duration_sec
                : run.duration != null
                    ? run.duration
                    : run.elapsed;
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

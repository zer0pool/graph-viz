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
        runHistoryRange,
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
        this.runHistoryRange = runHistoryRange;

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
            total: runs.length,
        };
        if (this.sumRunning) this.sumRunning.textContent = sum.running;
        if (this.sumSuccess) this.sumSuccess.textContent = sum.success;
        if (this.sumFailed) this.sumFailed.textContent = sum.failed;

        // Calculate and render date range
        if (this.runHistoryRange && runs.length > 0) {
            let minTime = Infinity;
            let maxTime = -Infinity;
            runs.forEach(r => {
                const ts = this.getRunTimestamp(r);
                if (ts) {
                    minTime = Math.min(minTime, ts);
                    maxTime = Math.max(maxTime, ts);
                }
            });

            if (minTime !== Infinity && maxTime !== -Infinity) {
                const formatDate = (ts) => {
                    return new Date(ts).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                    });
                };
                const startStr = formatDate(minTime);
                const endStr = formatDate(maxTime);
                const dateText = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
                this.runHistoryRange.textContent = dateText;
            } else {
                this.runHistoryRange.textContent = "No valid dates";
            }
        } else if (this.runHistoryRange) {
            this.runHistoryRange.textContent = "-";
        }
    }

    renderRuns(rows = []) {
        if (!this.runsBody) return;

        this.latestRuns = Array.isArray(rows) ? rows : [];
        this.runHistoryPage = 0;

        // Render timeline with ALL runs (filtering for failed dots)
        this.renderTimeline(this.latestRuns);

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

    async renderTimeline(allRuns = []) {
        if (!this.runsTimeline) return;

        // Clear previous content
        this.runsTimeline.innerHTML = "";

        if (!allRuns.length) {
            this.setTimelinePlaceholder("No run history available.");
            return;
        }

        // Create container for Title + Chart
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        const title = document.createElement("div");
        title.textContent = "Run Status";
        title.style.fontSize = "12px";
        title.style.color = "#6b7280";
        title.style.textTransform = "uppercase";
        title.style.letterSpacing = "0.05em";
        title.style.marginBottom = "8px";
        title.style.fontWeight = "600";
        wrapper.appendChild(title);

        const CHART_HEIGHT = 40;
        const container = document.createElement("div");
        container.style.width = "100%";
        container.style.height = `${CHART_HEIGHT}px`;
        wrapper.appendChild(container);

        this.runsTimeline.appendChild(wrapper);

        // Sort runs by time (oldest to newest for the chart)
        const sortedRuns = [...allRuns].sort((a, b) => {
            const tA = this.getRunTimestamp(a) || 0;
            const tB = this.getRunTimestamp(b) || 0;
            return tA - tB;
        });

        // Colors
        const COLORS = {
            SUCCESS: "#188038",
            FAILED: "#C5221F",
            RUNNING: "#1a73e8",
            UNKNOWN: "#E5E7EB" // Gray
        };

        const getStatusColor = (status) => {
            const s = (status || "").toLowerCase();
            if (/success|completed|done/.test(s)) return COLORS.SUCCESS;
            if (/failed|error|cancelled/.test(s)) return COLORS.FAILED;
            if (/running|pending|queued/.test(s)) return COLORS.RUNNING;
            return COLORS.UNKNOWN;
        };

        // Prepare data series
        // X-axis: indices (0 to N-1)
        // Y-axis: always 1 (full height bar)
        const seriesData = sortedRuns.map((run, idx) => {
            const status = run.state || run.status || "unknown";
            return {
                value: 1, // Full height
                itemStyle: {
                    color: getStatusColor(status)
                },
                // Store run data for tooltip/click
                data: run,
                runIndex: idx // index in sorted list
            };
        });

        const option = {
            grid: {
                top: 5,
                bottom: 5, // Compact
                left: 0,
                right: 0
            },
            tooltip: {
                trigger: "item",
                confine: true,
                formatter: (params) => {
                    const run = params.data.data;
                    const status = (run.state || run.status || "unknown").toUpperCase();
                    const startRaw = run.start_time || run.data_interval_end || "-";
                    const durationRaw = run.duration_sec != null ? run.duration_sec : (run.duration || run.elapsed || null);
                    const duration = durationRaw != null ? this.formatDuration(durationRaw) : "-";

                    return `
                        <div style="font-size:12px; font-weight:600; margin-bottom:4px;">RUN ID: ${run.run_id || run.run || "-"}</div>
                        <div style="font-size:11px;">Status: <span style="color:${params.color}">${status}</span></div>
                        <div style="font-size:11px;">Start: ${startRaw}</div>
                        <div style="font-size:11px;">Duration: ${duration}</div>
                    `;
                }
            },
            xAxis: {
                type: "category",
                show: false,
                data: sortedRuns.map((_, i) => i)
            },
            yAxis: {
                type: "value",
                show: false,
                max: 1
            },
            series: [
                {
                    type: "bar",
                    data: seriesData,
                    barWidth: "90%", // Distinct blocks (Airflow style)
                    barCategoryGap: "10%",
                    cursor: "pointer",
                    showBackground: true,
                    backgroundStyle: {
                        color: "#f1f5f9"
                    }
                }
            ]
        };

        // Initialize ECharts
        if (window.echarts) {
            const chart = window.echarts.init(container);
            chart.setOption(option);

            chart.on("click", (params) => {
                if (params.data && params.data.data) {
                    this.openRunDrawer(params.data.data);
                }
            });

            // Auto resize
            new ResizeObserver(() => {
                chart.resize();
            }).observe(container);
        } else {
            console.warn("ECharts not found on window");
            this.setTimelinePlaceholder("Chart library not loaded.");
        }
    }

    calculateTimelinePoints(runs = [], indices = [], minTime, maxTime) {
        // Deprecated but kept if needed for fallback logic, though not used by renderTimeline anymore.
        return [];
    }

    // getRunTimestamp maintained from existing code
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

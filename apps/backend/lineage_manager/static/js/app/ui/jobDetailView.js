/**
 * JobDetailView - Render job overview, run history, and lineage summaries
 */

export class JobDetailView {
    constructor(container) {
        if (!container) return;
        this.container = container;

        // Root elements
        this.section = container.querySelector("#job-details");
        this.label = container.querySelector("#job-label");
        this.tabs = container.querySelector("#job_tabs");
        this.panels = container.querySelector('.detail-tab-panels[data-tab-group="job"]');

        // Run history elements
        this.runsBody = container.querySelector("#job-runs-body");
        this.runsTimeline = container.querySelector("#job-run-timeline");
        this.runDrawerFields = container.querySelector("#run-drawer-fields");
        this.runDrawerSubtitle = container.querySelector("#run-drawer-subtitle");
        this.runHistoryBody = container.querySelector("#run-history-body");
        this.runHistoryPagination = container.querySelector("#run-history-pagination");
        this.runHistoryPageLabel = container.querySelector("#run-history-page-label");
        this.runHistoryPrev = container.querySelector("#run-history-prev");
        this.runHistoryNext = container.querySelector("#run-history-next");

        // Summary elements
        this.sumRunning = container.querySelector("#sum-running");
        this.sumSuccess = container.querySelector("#sum-success");
        this.sumFailed = container.querySelector("#sum-failed");

        // Overview elements
        this.overviewPlaceholder = container.querySelector("#job-overview-placeholder");
        this.overviewContent = container.querySelector("#job-overview-content");
        this.overviewFields = {
            status: container.querySelector("#job-status"),
            schedule: container.querySelector("#job-schedule"),
            owner: container.querySelector("#job-owner"),
            jobType: container.querySelector("#job-type"),
            logicType: container.querySelector("#job-logic-type"),
            project: container.querySelector("#job-project"),
            dagActive: container.querySelector("#job-dag-active"),
            encryption: container.querySelector("#job-encryption"),
            encryptionField: container.querySelector("#job-encryption-field"),
        };

        this.labelsSection = container.querySelector("#job-labels-section");
        this.labelsContainer = container.querySelector("#job-labels-container");
        this.inputList = container.querySelector("#job-input-list");
        this.outputList = container.querySelector("#job-output-list");

        // Lineage elements - updated for new structure
        this.lineagePane = container.querySelector("#job-lineage-pane");
        this.lineageInputsBody = container.querySelector("#job-lineage-inputs-body");
        this.lineageOutputs = container.querySelector("#job-lineage-outputs");

        this.latestRuns = [];
        this.collapseState = {};
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

        // Update panel header with the name from detail response if available
        if (detail.name) {
            this.setLabel(detail.name, false);
            // Also update the main panel title if possible (PanelController handles this usually)
            const panelTitle = document.getElementById("node-title");
            if (panelTitle) panelTitle.textContent = detail.name;
        }

        const fields = this.overviewFields || {};
        this.setField(fields.status, detail.status || "-");
        this.setField(fields.project, detail.project || "-");

        // Handle schedule formatting
        const scheduleHtml = this.formatDetailedSchedule(detail.schedule);
        if (fields.schedule) fields.schedule.innerHTML = scheduleHtml;

        // Handle multi-owner with truncation
        this.renderOwners(fields.owner, detail.owners || detail.owner);

        this.setField(fields.jobType, detail.type || "-");
        this.setField(fields.logicType, detail.logic_type || "-");
        
        // DAG Active rendering
        const dagActive = detail.is_dag_active;
        if (fields.dagActive) {
            const isActive = dagActive === true || String(dagActive).toLowerCase() === "true";
            fields.dagActive.innerHTML = `<span class="pill ${isActive ? 'status-success' : 'status-failed'}">${isActive ? 'Active' : 'Inactive'}</span>`;
        }

        // Encryption Configs
        this.renderEncryption(fields, detail.enc_configs);

        this.renderLabels(detail.labels);
    }

    renderEncryption(fields, configs) {
        if (!fields.encryptionField || !fields.encryption) return;
        
        if (!configs || typeof configs !== "object") {
            fields.encryptionField.hidden = true;
            return;
        }

        const activeEncs = [];
        if (configs.file_enc) activeEncs.push("File");
        if (configs.column_enc) activeEncs.push("Column");

        if (activeEncs.length === 0) {
            fields.encryptionField.hidden = true;
            return;
        }

        fields.encryptionField.hidden = false;
        fields.encryption.innerHTML = activeEncs.map(e => `<span class="pill">${e}</span>`).join(" ");
    }

    renderOwners(container, owners) {
        if (!container) return;
        if (!owners || (Array.isArray(owners) && owners.length === 0)) {
            container.textContent = "-";
            return;
        }

        const ownerList = Array.isArray(owners) ? owners : [owners];
        const threshold = 2;
        
        const render = (isExpanded) => {
            container.innerHTML = "";
            const visible = isExpanded ? ownerList : ownerList.slice(0, threshold);
            
            const text = visible.join(", ");
            const span = document.createElement("span");
            span.textContent = text;
            container.appendChild(span);

            if (!isExpanded && ownerList.length > threshold) {
                const moreCount = ownerList.length - threshold;
                const moreBtn = document.createElement("button");
                moreBtn.type = "button";
                moreBtn.className = "link-btn ml-2";
                moreBtn.style.fontSize = "11px";
                moreBtn.textContent = `+${moreCount} more`;
                moreBtn.onclick = (e) => {
                    e.stopPropagation();
                    render(true);
                };
                container.appendChild(moreBtn);
            } else if (isExpanded && ownerList.length > threshold) {
                const hideBtn = document.createElement("button");
                hideBtn.type = "button";
                hideBtn.className = "link-btn ml-2";
                hideBtn.style.fontSize = "11px";
                hideBtn.textContent = "Show less";
                hideBtn.onclick = (e) => {
                    e.stopPropagation();
                    render(false);
                };
                container.appendChild(hideBtn);
            }
        };

        render(false);
    }

    renderLabels(labels) {
        if (!this.labelsSection || !this.labelsContainer) return;

        if (!labels || Object.keys(labels).length === 0) {
            this.labelsSection.hidden = true;
            return;
        }

        this.labelsSection.hidden = false;

        this.labelsContainer.innerHTML = "";
        for (const [key, value] of Object.entries(labels)) {
            const pill = document.createElement("span");
            pill.className = "pill";
            pill.textContent = (value !== undefined && value !== null) ? `${key}: ${value}` : key;
            this.labelsContainer.appendChild(pill);
        }
    }

    formatDetailedSchedule(schedule) {
        if (!schedule) return "-";

        // Handle simple string
        if (typeof schedule === "string") {
            return `<div class="schedule-container"><span class="cron-badge">${schedule}</span></div>`;
        }

        if (typeof schedule === "object") {
            const cron = schedule.cron_expression || schedule.cron || schedule.expression || schedule.rate || null;
            const start = schedule.start_date;
            const end = schedule.end_date;

            let html = '<div class="schedule-container">';

            if (cron) {
                html += `<span class="cron-badge">${cron}</span>`;
            }

            if (start || end) {
                html += `
                    <div class="schedule-range">
                        <span class="range-value">${start || "?"}</span>
                        <span class="range-label">~</span>
                        <span class="range-value">${end || "?"}</span>
                    </div>
                `;
            }

            if (!cron && !start && !end) return "-";

            html += '</div>';
            return html;
        }
        return "-";
    }

    setField(node, value) {
        if (node) node.textContent = value ?? "-";
    }

    renderIOLinks(inputs = [], outputs = []) {
        this.renderList(this.inputList, inputs, "No input tables detected.", "overview_inputs", true);
        this.renderList(this.outputList, outputs, "No output tables detected.", "overview_outputs", true);
    }

    setLineagePlaceholder(message) {
        // No-op: Placeholder removed in new structure
    }

    renderLineageSummary(inputs = [], outputs = []) {
        // Simply render the dependency table - no placeholder needed
        this.renderDependencyTable(this.lineageInputsBody, inputs);
        this.renderList(this.lineageOutputs, outputs, "No output tables detected.", "lineage_outputs");
    }

    renderDependencyTable(target, items = []) {
        if (!target) return;
        if (!items.length) {
            target.innerHTML = `<tr><td colspan="2" class="empty">No input tables detected.</td></tr>`;
            return;
        }

        target.innerHTML = items.map(entry => {
            const item = typeof entry === "string" ? { name: entry } : entry || {};
            const tableName = item.name || item.full_name || "Unknown";

            const depType = (item.dependency_type || "").toUpperCase();
            const isHard = depType === "HARD";

            const icon = isHard ? "⏳" : "🔗";
            const behaviorText = isHard
                ? "Waits for data readiness"
                : "Runs on schedule (does not wait)";
            const tooltip = isHard
                ? "This job periodically checks this table and starts only when new data is available."
                : "This job executes regardless of data readiness in this table.";

            return `
                <tr>
                    <td>
                        <div class="table-name-cell">${tableName}</div>
                    </td>
                    <td>
                        <div class="execution-behavior" data-tooltip="${tooltip}">
                            <span class="behavior-icon">${icon}</span>
                            <span class="behavior-text">${behaviorText}</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    renderList(target, items = [], emptyText = "No items", key, collapsible = true) {
        if (!target) return;
        if (!items.length) {
            target.innerHTML = `<li class="empty">${emptyText}</li>`;
            return;
        }

        const initialThreshold = 3;
        const expandIncrement = 4;
        const isCollapsible = collapsible && items.length > initialThreshold;

        // Track how many items to show (starts at 3, increases by 4 each time)
        const currentLimit = this.collapseState[key] || initialThreshold;
        const visibleItems = !isCollapsible ? items : items.slice(0, currentLimit);

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

        if (isCollapsible && currentLimit < items.length) {
            const remaining = items.length - currentLimit;
            const nextIncrement = Math.min(expandIncrement, remaining);
            const label = `+ ${remaining} more ${remaining === 1 ? 'item' : 'items'}…`;
            const toggle = document.createElement("li");
            toggle.className = "io-toggle";
            toggle.innerHTML = `<button type="button">${label}</button>`;
            toggle.querySelector("button").addEventListener("click", () => {
                this.collapseState[key] = currentLimit + expandIncrement;
                this.renderList(target, items, emptyText, key, collapsible);
            });
            target.appendChild(toggle);
        } else if (isCollapsible && currentLimit >= items.length && currentLimit > initialThreshold) {
            // Show "Hide" button if expanded
            const toggle = document.createElement("li");
            toggle.className = "io-toggle";
            toggle.innerHTML = `<button type="button">Hide items</button>`;
            toggle.querySelector("button").addEventListener("click", () => {
                this.collapseState[key] = initialThreshold;
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

    renderSummary(data = []) {
        if (!data) return;

        // Support both direct summary object (backend calculated) and array (legacy calc)
        let sum;
        if (Array.isArray(data)) {
            sum = {
                running: data.filter((r) => ["running", "pending", "queued"].includes((r.status || "").toLowerCase())).length,
                success: data.filter((r) => ["success", "completed", "done"].includes((r.status || "").toLowerCase())).length,
                failed: data.filter((r) => ["failed", "error", "cancelled"].includes((r.status || "").toLowerCase())).length,
                total: data.length,
            };
        } else {
            sum = {
                running: data.running || 0,
                success: data.success || 0,
                failed: data.failed || 0,
                total: data.total || 0
            };
        }
        if (this.sumRunning) this.sumRunning.textContent = sum.running;
        if (this.sumSuccess) this.sumSuccess.textContent = sum.success;
        if (this.sumFailed) this.sumFailed.textContent = sum.failed;

        // Calculate and render date range only if we have the runs array
        if (this.runHistoryRange && Array.isArray(data) && data.length > 0) {
            let minTime = Infinity;
            let maxTime = -Infinity;
            data.forEach(r => {
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

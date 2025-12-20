/**
 * PanelController (New) - Orchestrator for all detail panel operations
 * Coordinates between job view, table view, triggers, timelines, lineage
 * Refactored from 747 lines into modular architecture (~150 lines)
 */

import JobDetailView from "./jobDetailView.js";
import TableDetailView from "./tableDetailView.js";
import { TableTimelinessView } from "./timelinesView.js";
import TriggerManager from "./triggerManager.js";
import LineageInsightProvider from "./lineageInsightProvider.js";
import { RelationState, selectionState } from "../state.js";

export class PanelController {
    constructor(apiClient) {
        this.api = apiClient;
        this.relations = new RelationState();

        // Status elements
        this.elements = {
            title: document.getElementById("node-title"),
            badge: document.getElementById("node-type-badge"),
            status: document.getElementById("graph-status"),
            statusText: document.getElementById("graph-status-text"),
        };

        // Delegate modules
        this.jobView = new JobDetailView({
            section: document.getElementById("job-details"),
            label: document.getElementById("job-label"),
            tabs: document.getElementById("job_tabs"),
            panels: document.querySelector('.detail-tab-panels[data-tab-group="job"]'),
            runsBody: document.getElementById("job-runs-body"),
            runsTimeline: document.getElementById("job-run-timeline"),
            runDrawer: document.getElementById("run-detail-drawer"),
            runDrawerFields: document.getElementById("run-drawer-fields"),
            runDrawerSubtitle: document.getElementById("run-drawer-subtitle"),
            runDrawerClose: document.getElementById("run-drawer-close"),
            runHistoryPagination: document.getElementById("run-history-pagination"),
            runHistoryPageLabel: document.getElementById("run-history-page-label"),
            runHistoryPrev: document.getElementById("run-history-prev"),
            runHistoryNext: document.getElementById("run-history-next"),
            // Summary elements
            sumRunning: document.getElementById("sum-running"),
            sumSuccess: document.getElementById("sum-success"),
            sumFailed: document.getElementById("sum-failed"),
            runHistoryRange: document.getElementById("run-history-range"),
            overviewPlaceholder: document.getElementById("job-overview-placeholder"),
            overviewContent: document.getElementById("job-overview-content"),
            overviewFields: {
                status: document.getElementById("job-status"),
                schedule: document.getElementById("job-schedule"),
                owner: document.getElementById("job-owner"),
                destination: document.getElementById("job-destination"),
                mode: document.getElementById("job-write-mode"),
            },
            inputList: document.getElementById("job-input-list"),
            outputList: document.getElementById("job-output-list"),
            lineagePlaceholder: document.getElementById("job-lineage-placeholder"),
            lineageContent: document.getElementById("job-lineage-content"),
            lineageInputs: document.getElementById("job-lineage-inputs"),
            lineageOutputs: document.getElementById("job-lineage-outputs"),
        });

        this.tableView = new TableDetailView({
            section: document.getElementById("table-details"),
            tabs: document.getElementById("table_tabs"),
            panels: document.querySelector('.detail-tab-panels[data-tab-group="table"]'),
            fullName: document.getElementById("table-full-name"),
            description: document.getElementById("table-description"),
            docLink: document.getElementById("table-doc-link"),
            owner: document.getElementById("table-owner"),
            storageSummary: document.getElementById("table-storage"),
            partitionSummary: document.getElementById("table-partition"),
            updated: document.getElementById("table-updated"),
            storageFields: {
                type: document.getElementById("table-storage-type"),
                partitionField: document.getElementById("table-partition-field"),
                partitionType: document.getElementById("table-partition-type"),
                clusterColumns: document.getElementById("table-cluster-columns"),
                location: document.getElementById("table-storage-location"),
            },
            statsFields: {
                rows: document.getElementById("table-stat-rows"),
                size: document.getElementById("table-stat-size"),
                cost: document.getElementById("table-stat-cost"),
            },
            tagsSection: document.getElementById("table-tags"),
            tagsList: document.getElementById("table-tags-list"),
            schemaCount: document.getElementById("schema-column-count"),
            schemaBody: document.getElementById("table-schema-body"),
            schemaEmpty: document.getElementById("table-schema-empty"),
        });

        this.timelinesView = new TableTimelinessView({
            pane: document.getElementById("activity-pane"),
            dailyChart: document.getElementById("timelines-daily-chart"),
            hourlyChart: document.getElementById("timelines-hourly-chart"),
            dailyPlaceholder: document.getElementById("timelines-daily-placeholder"),
            hourlyPlaceholder: document.getElementById("timelines-hourly-placeholder"),
            hourlyLabel: document.getElementById("timelines-hourly-label"),
        });

        this.triggerManager = new TriggerManager(this.api);
        this.lineageProvider = new LineageInsightProvider();

        // State tracking
        this.currentTable = null;
        this.currentTableNode = null;
        this.currentJob = null;
        this.currentJobNodeId = null;
        this.jobOverviewRequestId = 0;
        this.jobRelations = { inputs: [], outputs: [] };
        this.activeTabs = { table: "overview", job: "overview" };
        this.tableLoaded = { detail: false, schema: false };
        this.isJobRunLoading = false;
        this.isTimelinessLoading = false;
        this.selectedTimelinessDay = null;
        this.timelinesCache = null;
        this.lineageSummaryCache = new Map();
        this.lineageSummaryRequestId = 0;
        this.isLineageSummaryLoading = false;

        this.viewGraphButton = document.getElementById("detail-view-graph");
        this.currentDetailType = null;
        this.bindViewGraphButton();

        this.setPlaceholder();
        this.bindTabEvents();
        this.bindTimelinessEvents();

        // Subscribe to shared state
        selectionState.subscribe((nodeData) => {
            if (!nodeData) {
                this.setPlaceholder();
            } else {
                // Adapter: Ensure we have a "node-like" object
                // If nodeData comes from GraphController, it *might* have rich data in nodeData.data
                // If from ListController, it might be minimal { id, type, label }

                // Construct a standardized node object for internal methods
                const mockNode = {
                    id: () => nodeData.id,
                    data: (key) => {
                        // Access data property if available, else fallback to nodeData root props
                        const d = nodeData.data || nodeData;
                        if (key) return d[key];
                        return d;
                    }
                };

                this.updateMetadata(mockNode);

                // Note: updateRelations expects 'incomers'/'outgoers' which are Cy-specific function.
                // If source is 'list', we don't have graph topology here unless we query graph or lineage state.
                // For now, if source is not graph, we might skip updateRelations or try to use lineageState?
                if (nodeData.source === "graph") {
                    // If we passed the REAL cy element in nodeData (not serializable), we could use it.
                    // But we shouldn't pass Cy elements in state.
                    // So PanelController needs to handle "No graph relations available" or Query GraphController?
                    // Ideally PanelController shouldn't know GraphController.
                    // Solution: GraphController updates RelationState? Yes, GraphController updates RelationState!
                    // And PanelController should subscribe to RelationState changes?
                    // Currently GraphController calls `this.panel.updateRelations(node)`.
                    // We removed that.
                    // GraphController should update `relationState.set(upstream, downstream)`.
                    // And PanelController should read from `this.relations`.
                }
            }
        });
    }

    bindViewGraphButton() {
        if (!this.viewGraphButton) return;
        this.viewGraphButton.addEventListener("click", () => {
            if (this.viewGraphButton.disabled) return;
            if (this.currentDetailType === "job" && this.currentJobNodeId) {
                document.dispatchEvent(
                    new CustomEvent("job-detail:view-in-graph", {
                        detail: { nodeId: this.currentJobNodeId },
                    })
                );
            } else if (this.currentDetailType === "table" && this.currentTableNode) {
                document.dispatchEvent(
                    new CustomEvent("table-detail:view-in-graph", {
                        detail: { nodeId: this.currentTableNode.id() },
                    })
                );
            }
        });
    }

    setViewGraphAvailability(enabled, type = null) {
        if (!this.viewGraphButton) return;
        this.viewGraphButton.disabled = !enabled;
        this.currentDetailType = enabled ? type : null;
    }

    /**
     * Set placeholder state
     */
    setPlaceholder() {
        if (this.elements.title) this.elements.title.textContent = "Search the graph";
        if (this.elements.badge) {
            this.elements.badge.textContent = "-";
            this.elements.badge.classList.add("muted");
        }

        this.jobView.hide();
        this.jobView.reset();
        this.tableView.hide();
        this.tableView.setDetails(null);
        this.triggerManager.hide();

        this.jobView.setLabel("Select a node to view its details.", true);

        this.currentTable = null;
        this.currentTableNode = null;
        this.currentJob = null;
        this.currentJobNodeId = null;
        this.jobRelations = { inputs: [], outputs: [] };
        this.jobOverviewRequestId += 1;
        this.activeTabs.table = "overview";
        this.activeTabs.job = "overview";
        this.isJobRunLoading = false;
        this.lineageSummaryRequestId += 1;

        this.resetTimelinessState();
        this.resetLineageSummaryState();
        this.setViewGraphAvailability(false);
    }

    /**
     * Update panel with node metadata
     */
    updateMetadata(node) {
        if (!node) return;

        const type = (node.data("type") || "job").toLowerCase();

        if (this.elements.title) {
            this.elements.title.textContent = node.data("label") || node.id();
        }
        if (this.elements.badge) {
            const isTable = type === "table";
            this.elements.badge.textContent = isTable ? "TABLE" : "JOB";
            this.elements.badge.classList.remove("muted", "table-type", "job-type");
            this.elements.badge.classList.add(isTable ? "table-type" : "job-type");
        }

        console.info("DetailPanel:update", { id: node.id(), type });

        if (type === "table") {
            this.renderTableDetails(node);
        } else {
            this.renderJobDetails(node);
        }

        this.setViewGraphAvailability(true, type);
    }

    /**
     * Update relations (upstream/downstream)
     */
    updateRelations(node) {
        if (!node) return;
        const formatNode = (cyNode) => ({
            id: cyNode.id(),
            label: cyNode.data("label") || cyNode.id(),
            type: (cyNode.data("type") || "").toLowerCase(),
            full_name: cyNode.data("full_name") || cyNode.data("label") || null,
            job_id: cyNode.data("job_id") || null,
        });

        const upstream = node.incomers("node").map((n) => formatNode(n));
        const downstream = node.outgoers("node").map((n) => formatNode(n));
        this.relations.set(upstream, downstream);

        if (this.currentJobNodeId === node.id()) {
            const inputs = upstream.filter((item) => item.type !== "job");
            const outputs = downstream.filter((item) => item.type !== "job");
            this.jobRelations = { inputs, outputs };
            this.jobView.renderIOLinks(inputs, outputs);
            this.jobView.renderLineageSummary(inputs, outputs);
        }
    }

    /**
     * Render triggers for table node
     */
    async renderTriggers(node) {
        await this.triggerManager.render(node);
    }

    /**
     * Render job details
     */
    renderJobDetails(node) {
        this.tableView.hide();
        this.jobView.show();
        this.triggerManager.hide();
        this.resetLineageSummaryState();

        this.currentTable = null;
        this.currentTableNode = null;
        const rawId = node.id();
        this.currentJob = (node.data("job_id") || rawId).replace(/^job:/, '');
        this.currentJobNodeId = rawId;
        this.isJobRunLoading = false;
        this.lineageSummaryRequestId += 1;

        this.jobView.setLabel(node.data("label") || node.id(), false);
        this.jobView.setRunsPlaceholder('Select "Run history" tab to load data.');
        this.jobView.setOverviewLoading("Loading job details…");
        this.jobView.renderIOLinks([], []);
        this.jobView.setLineagePlaceholder('Select "Lineage" to view related tables.');
        this.jobRelations = { inputs: [], outputs: [] };

        this.resetTimelinessState();

        this.jobOverviewRequestId += 1;
        this.fetchJobOverview(this.currentJob, this.jobOverviewRequestId);

        if (this.activeTabs.job === "runs" && this.currentJob) {
            this.fetchJobRunHistory(true);
        }
    }

    /**
     * Render table details
     */
    renderTableDetails(node) {
        this.jobView.hide();
        this.tableView.show();

        this.currentJob = null;
        const rawName = node.data("full_name") || node.data("label") || node.id();
        this.currentTable = rawName ? rawName.replace(/^table:/, '') : null;
        this.currentTableNode = node;
        this.lineageSummaryRequestId += 1;

        this.resetTimelinessState('Select "Activity" tab to load timelines data.');
        this.resetLineageSummaryState('Select "Lineage" tab to load lineage summary.');

        // Populate table metadata immediately from node data (fast UX)
        const detailPayload = this.buildTableDetailPayload(node);
        this.tableView.setDetails(detailPayload);

        // Then fetch authoritative detail from backend and overwrite view when available
        this.tableLoaded.detail = false;
        if (this.currentTable) {
            this.api
                .fetchTableDetail(this.currentTable)
                .then((payload) => {
                    // Payload expected shape: { status, input, result }
                    if (!payload || payload.status !== "success") return;
                    const result = payload.result || payload;
                    // Map backend result to tableView expected shape
                    const mapped = {
                        fullName: result.full_name || result.fullName || this.currentTable,
                        overview: {
                            owner: result.owner || null,
                            description: result.description || null,
                            documentation_url: result.documentation_url || null,
                            updated_at: result.modified || result.updated || result.modified_at || null,
                            tags: result.labels || result.tags || null,
                        },
                        storage: {
                            type: result.table_type || null,
                            partition: result.storage?.partitioning || null,
                            partition_field: null,
                            partition_type: null,
                            cluster_columns: result.storage?.clustering || null,
                            location: result.location || null,
                        },
                        stats: {
                            row_count: result.storage?.num_rows ?? null,
                            size_bytes: result.storage?.num_bytes ?? null,
                            storage_cost: null,
                            updated_at: result.modified || null,
                        },
                        schema: {},
                    };

                    this.tableView.setDetails(mapped);
                    this.tableLoaded.detail = true;
                })
                .catch((err) => {
                    console.warn("Failed to fetch table detail", err);
                });
        }

        // Prepare lineage summary view
        if (this.activeTabs.table === "lineage") {
            this.ensureLineageSummary();
        } else if (this.currentTable) {
            const cached = this.lineageSummaryCache.get(this.currentTable);
            if (cached) {
                this.lineageProvider.setSummary(cached);
            } else {
                this.lineageProvider.setIdle('Select "Lineage" tab to load lineage summary.');
            }
        }

        // Fetch timelines if activity tab is active
        if (this.activeTabs.table === "activity" && this.currentTable) {
            this.ensureActivityData(true);
        }
    }

    /**
     * Fetch job overview details
     */
    async fetchJobOverview(jobId, requestId) {
        if (!jobId) return;
        try {
            const detail = await this.api.fetchJobDetail(jobId);
            if (requestId !== this.jobOverviewRequestId) return;
            // Render overview with properties
            // The API now returns a 'properties' object containing most metadata
            const overviewData = detail.properties || {};
            // Ensure status/enabled are available if they were on the top level before
            overviewData.status = overviewData.status || detail.status;
            overviewData.enabled = overviewData.enabled || detail.enabled;

            this.jobView.renderOverview(overviewData);

            // Populate I/O links from API response (using upstreams/downstreams)
            let inputs = [];
            if (Array.isArray(detail.upstreams)) {
                inputs = detail.upstreams
                    .filter(u => u.type === 'table')
                    .map(u => u.name);
            }

            let outputs = [];
            if (Array.isArray(detail.downstreams)) {
                outputs = detail.downstreams
                    .filter(d => d.type === 'table')
                    .map(d => d.name);
            }

            // Fallback to legacy fields if new ones are empty (just in case)
            if (inputs.length === 0 && Array.isArray(detail.reference_tables)) {
                inputs = detail.reference_tables;
            }
            if (outputs.length === 0) {
                if (detail.destination_table) outputs = [detail.destination_table];
                else if (Array.isArray(detail.destinations)) outputs = detail.destinations;
            }


            // If API returns empty lists but we already have relations from the graph (via updateRelations),
            // prefer the graph data to avoid clearing the list.
            if (inputs.length === 0 && this.jobRelations.inputs.length > 0) {
                inputs = this.jobRelations.inputs;
            }
            if (outputs.length === 0 && this.jobRelations.outputs.length > 0) {
                outputs = this.jobRelations.outputs;
            }

            // Update local state for lineage tab
            this.jobRelations = { inputs, outputs };

            // Render directly
            this.jobView.renderIOLinks(inputs, outputs);
            this.jobView.renderLineageSummary(inputs, outputs);

        } catch (err) {
            if (requestId !== this.jobOverviewRequestId) return;
            console.error("Job detail fetch failed", err);
            this.jobView.setOverviewError("Failed to load job details.");
        }
    }

    buildJobOverview(detail = {}) {
        const metadata = detail.metadata || {};
        return {
            status: detail.status || metadata.status || metadata.run_status || "-",
            owner: detail.owner || metadata.owner || "-",
            schedule: this.formatSchedule(metadata.schedule || metadata.cron),
            destination:
                detail.destination_table ||
                metadata.destination ||
                this.extractDestination(metadata) ||
                "-",
            write_mode: detail.write_mode || metadata.write_mode || "-",
        };
    }

    formatSchedule(schedule) {
        if (!schedule) return "-";
        if (typeof schedule === "string") return schedule;
        if (typeof schedule === "object") {
            if (schedule.cron) return `Cron ${schedule.cron}`;
            if (schedule.expression) return schedule.expression;
            if (schedule.rate) return schedule.rate;
        }
        return "-";
    }

    extractDestination(metadata = {}) {
        if (Array.isArray(metadata.destinations) && metadata.destinations.length) {
            const first = metadata.destinations[0];
            if (typeof first === "string") return first;
            if (first?.name) return first.name;
        }
        if (Array.isArray(metadata.destination_tables) && metadata.destination_tables.length) {
            return metadata.destination_tables[0];
        }
        return metadata.destination_type || metadata.destination;
    }

    /**
     * Build table detail payload from node
     */
    buildTableDetailPayload(node) {
        const data = node?.data?.() || {};
        const props = data.properties || {};
        const metadata = data.metadata || {};
        const overviewMeta = data.table_overview || props["table.overview"] || metadata["table.overview"] || {};
        const storageMeta = props["table.storage"] || metadata["table.storage"] || {};
        const statsMeta = props["table.stats"] || metadata["table.stats"] || {};
        const schemaBlock = data.table_schema || props["table.schema"] || metadata["table.schema"] || {};

        const labels = overviewMeta.labels || data.labels || props.labels || metadata.labels || null;
        const tags = overviewMeta.tags || overviewMeta.tags_list || labels;
        const owner = overviewMeta.owner || data.owner || props.owner || metadata.owner || "-";
        const storageType = storageMeta.type || data.storage || props.storage_type || metadata.destination_type || "Table";
        const partitionValue = storageMeta.partition || data.partition || props.partition || metadata.partition || "-";
        const updatedAt = statsMeta.updated_at || data.updated_at || metadata.updated_at || overviewMeta.updated_at || null;

        return {
            fullName: data.full_name || data.label || node.id(),
            overview: {
                owner,
                description: overviewMeta.description || metadata.description || props.description,
                documentation_url: overviewMeta.documentation_url || metadata.documentation_url,
                updated_at: updatedAt,
                tags,
            },
            storage: {
                type: storageType,
                partition: partitionValue,
                location: storageMeta.location || props.location || "US",
            },
            stats: {
                schema: schemaBlock,
                fields: schemaBlock.fields || [],
            }
        };
    }

    /**
     * Bind tab change events
     */
    bindTabEvents() {
        document.addEventListener("detail-tabs:changed", (event) => {
            const group = event.detail?.group || "table";
            const tab = event.detail?.tab || (group === "table" ? "overview" : "runs");

            this.activeTabs[group] = tab;

            if (group === "table" && tab === "overview" && this.currentTable) {
                this.fetchTableOverview(this.currentTable);
            } else if (group === "table" && tab === "activity") {
                this.timelinesView.resize();
                if (this.currentTable) this.ensureActivityData();
                else {
                    this.timelinesView.setIdle('Select "Activity" tab to load timelines data.');
                }
            } else if (group === "table" && tab === "lineage") {
                if (this.currentTable) this.ensureLineageSummary();
                else this.lineageProvider.setIdle("Select a table to view lineage summary.");
            } else if (group === "table" && tab === "schema") {
                // Lazy-load schema when schema tab is opened
                if (this.currentTable && !this.tableLoaded.schema) {
                    this.tableLoaded.schema = false;
                    this.tableView.renderSchema({ columns: [] });
                    this.api
                        .fetchTableSchema(this.currentTable)
                        .then((payload) => {
                            if (!payload || payload.status !== "success") return;
                            const result = payload.result || payload;
                            const schema = { columns: Array.isArray(result.columns) ? result.columns : [] };
                            this.tableView.renderSchema(schema);
                            this.tableLoaded.schema = true;
                        })
                        .catch((err) => {
                            console.warn("Failed to fetch table schema", err);
                        });
                }
            } else if (group === "job" && tab === "runs" && this.currentJob) {
                this.fetchJobRunHistory();
            } else if (group === "job" && tab === "lineage") {
                if (this.jobRelations.inputs.length || this.jobRelations.outputs.length) {
                    this.jobView.renderLineageSummary(
                        this.jobRelations.inputs,
                        this.jobRelations.outputs
                    );
                } else if (this.currentJob) {
                    this.jobView.setLineagePlaceholder("No lineage information available.");
                } else {
                    this.jobView.setLineagePlaceholder('Select a job to view lineage.');
                }
            }
        });
    }

    /**
     * Bind timelines events
     */
    bindTimelinessEvents() {
        this.timelinesView.onDaySelected((date) => this.handleTimelinessDay(date));
        this.timelinesView.onRangeChanged((days) => this.fetchTimeliness(true, days));
        document.addEventListener("detail-panel:resized", () => this.timelinesView.resize());
    }

    /**
     * Reset timelines state
     */
    resetTimelinessState(message) {
        this.isTimelinessLoading = false;
        this.selectedTimelinessDay = null;

        if (this.timelinesView) {
            this.timelinesView.reset(message || 'Select "Activity" tab to load timelines data.');
        }
    }

    resetLineageSummaryState(message) {
        this.isLineageSummaryLoading = false;
        if (this.lineageProvider) {
            this.lineageProvider.setIdle(
                message || 'Select "Lineage" tab to load lineage summary.'
            );
        }
    }


    async fetchTimeliness(force = false, days = 7) {
        if (!this.currentTable || !this.timelinesView) return;
        if (this.isTimelinessLoading && !force) return;

        this.isTimelinessLoading = true;
        this.timelinesView.setLoading("Loading timelines…");

        const started = Date.now();
        try {
            // Pass days to API (e.g. ?days=14)
            const payload = await this.api.fetchTableTimeliness(this.currentTable, days);
            const elapsed = Date.now() - started;

            if (elapsed < 1000) {
                await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
            }

            if (payload.status !== "success") throw new Error("timelines failed");

            const result = payload.result || {};
            const daily = Array.isArray(result.daily_summary) ? result.daily_summary : [];
            // Cache hourly detail for later per-day lookups
            this.timelinesCache = result || null;

            this.selectedTimelinessDay = null;
            // Pass time_range to renderDaily so it can align charts to server time
            this.timelinesView.renderDaily(daily, this.selectedTimelinessDay, result.time_range);
            this.timelinesView.clearHourly();
        } catch (err) {
            console.error("Timeliness fetch failed", err);
            this.timelinesView.setError("Failed to load timelines.");
        } finally {
            this.isTimelinessLoading = false;
        }
    }

    async ensureLineageSummary(force = false) {
        if (!this.currentTable || !this.api) return;
        if (this.isLineageSummaryLoading && !force) return;

        const cacheKey = this.currentTable;
        if (!force && this.lineageSummaryCache.has(cacheKey)) {
            this.lineageProvider.setSummary(this.lineageSummaryCache.get(cacheKey));
            return;
        }

        const requestId = ++this.lineageSummaryRequestId;
        this.isLineageSummaryLoading = true;
        this.lineageProvider.setLoading();

        try {
            const payload = await this.api.fetchTableLineageSummary(cacheKey);
            if (requestId !== this.lineageSummaryRequestId) return;
            if (payload?.status === "success") {
                this.lineageSummaryCache.set(cacheKey, payload);
                this.lineageProvider.setSummary(payload);
            } else {
                throw new Error(payload?.message || "Lineage summary failed.");
            }
        } catch (error) {
            if (requestId !== this.lineageSummaryRequestId) return;
            console.warn("Failed to load lineage summary", error);
            this.lineageProvider.setError("Failed to load lineage summary.");
        } finally {
            if (requestId === this.lineageSummaryRequestId) {
                this.isLineageSummaryLoading = false;
            }
        }
    }

    /**
     * Handle timelines day selection
     */
    async handleTimelinessDay(date) {
        if (!date) return;
        this.selectedTimelinessDay = date;

        // Try to use cached hourly_detail from previous timelines fetch
        let rows = null;
        if (this.timelinesCache && this.timelinesCache.hourly_detail) {
            rows = this.timelinesCache.hourly_detail[date] || null;
        }

        if (!rows) {
            // Fetch fresh timelines payload and update cache
            try {
                const payload = await this.api.fetchTableTimeliness(this.currentTable);
                if (payload && payload.status === "success") {
                    const result = payload.result || {};
                    this.timelinesCache = result;
                    rows = result.hourly_detail ? result.hourly_detail[date] || null : null;
                }
            } catch (err) {
                console.warn("Failed to fetch hourly timelines", err);
            }
        }

        this.renderTimelinessHourly(date, rows);
    }

    /**
     * Render hourly timelines
     */
    renderTimelinessHourly(date, rows = null) {
        if (!this.timelinesView) return;

        if (!date) {
            this.timelinesView.clearHourly();
            return;
        }

        this.timelinesView.setSelectedDate(date);
        // Render hourly rows (may be null which will clear the hourly chart)
        this.timelinesView.renderHourly(date, rows);
    }

    /**
     * Ensure activity data is loaded
     */
    ensureActivityData(force = false) {
        if (!this.currentTable) return;
        this.fetchTimeliness(force);
    }

    /**
     * Fetch job run history
     */
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
            const summary = payload.result?.summary || {};

            this.jobView.renderRuns(rows);
            // Pass the backend-calculated summary directly
            this.jobView.renderSummary(summary);
        } catch (err) {
            this.jobView.setRunsPlaceholder("Failed to load run history.");
        } finally {
            this.isJobRunLoading = false;
        }
    }

    /**
     * Show status message
     */
    showStatus(message, visible = true) {
        if (!this.elements.status || !this.elements.statusText) return;
        this.elements.statusText.textContent = message;
        this.elements.status.hidden = !visible;
    }
    // ... (fetchJobRunHistory is fine) ...

    async fetchTableOverview(tableId) {
        if (!tableId) return;

        try {
            // Use the new details endpoint that mocks the ID but fetches real data
            const payload = await this.api.fetchTableDetails(tableId);
            if (payload.status !== "success") throw new Error(payload.message || "Failed");

            const detail = payload.result || {};
            const storage = detail.storage || {};
            const overview = detail.overview || {};

            // Populate DOM
            this.setSafeText("table-full-name", detail.full_name || tableId);

            // Handle owner fallback properly
            let owner = overview.owner || detail.owner || "-";
            if (owner === "-" && detail.labels && detail.labels.owner) {
                owner = detail.labels.owner;
            }
            this.setSafeText("table-owner", owner);

            this.setSafeText("table-storage", detail.storage_type || "BIGQUERY");
            this.setSafeText("table-partition", storage.partitioning || "-");

            // Dates - index.html has table-updated, usually corresponds to modified
            this.setSafeText("table-updated", this.formatDate(detail.modified));

            // Storage Details
            this.setSafeText("table-storage-type", "BigQuery");
            this.setSafeText("table-partition-field", storage.partitioning ? (storage.partitioning.match(/\((.*?)\)/)?.[1] || "DAY") : "-");
            this.setSafeText("table-partition-type", storage.partitioning ? storage.partitioning.split("(")[0] : "-");

            this.setSafeText("table-cluster-columns", (storage.clustering || []).join(", ") || "-");
            this.setSafeText("table-storage-location", detail.location || "-");

            // Stats
            this.setSafeText("table-stat-rows", (storage.num_rows || 0).toLocaleString());
            this.setSafeText("table-stat-size", this.formatBytes(storage.num_bytes || 0));

        } catch (err) {
            console.error("Table overview load failed", err);
        }
    }

    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    formatDate(isoString) {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleString();
    }

    setSafeText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

}

export default PanelController;

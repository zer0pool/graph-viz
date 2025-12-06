/**
 * PanelController (New) - Orchestrator for all detail panel operations
 * Coordinates between job view, table view, triggers, timeliness, lineage
 * Refactored from 747 lines into modular architecture (~150 lines)
 */

import JobDetailView from "./jobDetailView.js";
import TableDetailView from "./tableDetailView.js";
import { TableTimelinessView } from "./timelinessView.js";
import TriggerManager from "./triggerManager.js";
import LineageInsightProvider from "./lineageInsightProvider.js";
import { RelationState } from "../state.js";

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

        this.timelinessView = new TableTimelinessView({
            pane: document.getElementById("activity-pane"),
            dailyChart: document.getElementById("timeliness-daily-chart"),
            hourlyChart: document.getElementById("timeliness-hourly-chart"),
            dailyPlaceholder: document.getElementById("timeliness-daily-placeholder"),
            hourlyPlaceholder: document.getElementById("timeliness-hourly-placeholder"),
            hourlyLabel: document.getElementById("timeliness-hourly-label"),
        });

        this.triggerManager = new TriggerManager(this.api);
        this.lineageProvider = new LineageInsightProvider();

        // State tracking
        this.currentTable = null;
        this.currentTableNode = null;
        this.currentJob = null;
        this.activeTabs = { table: "overview", job: "runs" };
        this.isJobRunLoading = false;
        this.isTimelinessLoading = false;
        this.selectedTimelinessDay = null;

        this.setPlaceholder();
        this.bindTabEvents();
        this.bindTimelinessEvents();
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
        this.tableView.hide();
        this.tableView.setDetails(null);
        this.triggerManager.hide();

        this.jobView.setRunsPlaceholder("Select a job to view run history.");
        this.jobView.setLabel("Select a node to view its details.");

        this.currentTable = null;
        this.currentTableNode = null;
        this.currentJob = null;
        this.activeTabs.table = "overview";
        this.activeTabs.job = "runs";
        this.isJobRunLoading = false;

        this.resetTimelinessState();
        this.lineageProvider.setState(this.lineageProvider.createEmptyState());
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
            this.elements.badge.textContent = type === "table" ? "TABLE" : "JOB";
            this.elements.badge.classList.remove("muted");
        }

        console.info("DetailPanel:update", { id: node.id(), type });

        if (type === "table") {
            this.renderTableDetails(node);
        } else {
            this.renderJobDetails(node);
        }
    }

    /**
     * Update relations (upstream/downstream)
     */
    updateRelations(node) {
        const upstream = node.incomers("node").map((x) => x.data("label"));
        const downstream = node.outgoers("node").map((x) => x.data("label"));
        this.relations.set(upstream, downstream);
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
        this.lineageProvider.setState(this.lineageProvider.createEmptyState());

        this.currentTable = null;
        this.currentTableNode = null;
        this.currentJob = node.data("job_id") || node.id();
        this.isJobRunLoading = false;

        this.jobView.setLabel(node.data("label") || node.id());
        this.jobView.setRunsPlaceholder('Select "Run history" tab to load data.');

        this.resetTimelinessState();

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
        this.currentTable = node.data("full_name") || node.data("label") || null;
        this.currentTableNode = node;

        this.resetTimelinessState('Select "Activity" tab to load timeliness data.');

        // Populate table metadata
        const detailPayload = this.buildTableDetailPayload(node);
        this.tableView.setDetails(detailPayload);

        // Update lineage insights
        this.lineageProvider.updateInsights(node);

        // Fetch timeliness if activity tab is active
        if (this.activeTabs.table === "activity" && this.currentTable) {
            this.ensureActivityData(true);
        }
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
                labels,
            },
            storage: {
                type: storageType,
                partition: partitionValue,
                partition_field: storageMeta.partition_field || props.partition_field || partitionValue,
                partition_type: storageMeta.partition_type || props.partition_type || storageMeta.partitionType,
                cluster_columns: storageMeta.cluster_columns || props.cluster_columns || storageMeta.clusterColumns,
                location: storageMeta.location || metadata.location || props.location,
            },
            stats: {
                row_count: statsMeta.row_count ?? schemaBlock.row_count ?? schemaBlock.rows ?? data.rows ?? data.row_count ?? props.row_count ?? null,
                size_bytes: statsMeta.size_bytes ?? statsMeta.storage_bytes ?? schemaBlock.size_bytes ?? null,
                storage_cost: statsMeta.storage_cost ?? null,
                updated_at: updatedAt,
            },
            schema: schemaBlock,
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

            if (group === "table" && tab === "activity") {
                this.timelinessView.resize();
                if (this.currentTable) this.ensureActivityData();
                else {
                    this.timelinessView.setIdle('Select "Activity" tab to load timeliness data.');
                }
            } else if (group === "table" && tab === "lineage") {
                if (this.currentTableNode) this.lineageProvider.updateInsights(this.currentTableNode);
                else this.lineageProvider.setState(this.lineageProvider.createEmptyState());
            } else if (group === "job" && tab === "runs" && this.currentJob) {
                this.fetchJobRunHistory();
            }
        });
    }

    /**
     * Bind timeliness events
     */
    bindTimelinessEvents() {
        this.timelinessView.onDaySelected((date) => this.handleTimelinessDay(date));
        document.addEventListener("detail-panel:resized", () => this.timelinessView.resize());
    }

    /**
     * Reset timeliness state
     */
    resetTimelinessState(message) {
        this.isTimelinessLoading = false;
        this.selectedTimelinessDay = null;

        if (this.timelinessView) {
            this.timelinessView.reset(message || 'Select "Activity" tab to load timeliness data.');
        }
    }

    /**
     * Fetch timeliness data
     */
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

            this.selectedTimelinessDay = null;
            this.timelinessView.renderDaily(daily, this.selectedTimelinessDay);
            this.timelinessView.clearHourly();
        } catch (err) {
            console.error("Timeliness fetch failed", err);
            this.timelinessView.setError("Failed to load timeliness.");
        } finally {
            this.isTimelinessLoading = false;
        }
    }

    /**
     * Handle timeliness day selection
     */
    handleTimelineTime(date) {
        if (!date) return;
        this.selectedTimelinessDay = date;
        this.renderTimelinessHourly(date);
    }

    /**
     * Render hourly timeliness
     */
    renderTimelinessHourly(date) {
        if (!this.timelinessView) return;

        if (!date) {
            this.timelinessView.clearHourly();
            return;
        }

        this.timelinessView.setSelectedDate(date);
        // Note: hourly data fetching would be handled by timelinessView module
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
            this.jobView.renderRuns(rows);
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
}

export default PanelController;

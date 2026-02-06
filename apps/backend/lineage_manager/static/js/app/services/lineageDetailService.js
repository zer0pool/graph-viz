/**
 * LineageDetailService
 * 
 * Handles asynchronous fetching of additional metadata (owner, status, etc.)
 * for nodes in the lineage table views.
 */
export class LineageDetailService {
    constructor(api) {
        this.api = api;
        this.pendingRequests = new Set();
        this.cache = {}; // Persistent cache for enriched details
    }

    /**
     * Scan the table and fetch details for visible rows that are still loading.
     * @param {HTMLElement} tableBody - Tbody containing rows with data-id.
     */
    async enrichTableRows(tableBody) {
        const rows = Array.from(tableBody.querySelectorAll("tr[data-id]"));

        // Filter rows that haven't been enriched yet (identified by presence of placeholders or data-enriched)
        const targetIds = rows
            .filter(tr => !tr.dataset.enriched)
            .map(tr => tr.dataset.id);

        if (targetIds.length === 0) return;

        // Dedup and remove already pending
        const uniqueIds = [...new Set(targetIds)].filter(id => !this.pendingRequests.has(id));
        if (uniqueIds.length === 0) return;

        uniqueIds.forEach(id => this.pendingRequests.add(id));

        try {
            const payload = await this.api.fetchBatchDetails(uniqueIds);
            if (payload.status === "success") {
                // Merge into cache
                Object.assign(this.cache, payload.results);
                this._updateRows(tableBody, payload.results);
            }
        } catch (err) {
            console.error("[LineageDetailService] Batch fetch failed", err);
        } finally {
            uniqueIds.forEach(id => this.pendingRequests.delete(id));
        }
    }

    _updateRows(tableBody, resultsMap) {
        // Search globally for IDs in resultsMap to handle cases where 
        // the same node appears in multiple tables (e.g. Upstream vs Downstream)
        const allRows = document.querySelectorAll("tr[data-id]");
        let updatedCount = 0;

        allRows.forEach(tr => {
            const id = tr.dataset.id;
            if (resultsMap.hasOwnProperty(id)) {
                const details = resultsMap[id];
                if (!details) return;

                const tInfo = details.table_info || {};
                const jInfo = details.job_info || {};

                this._updateCell(tr, ".cell-write-mode", (tInfo.write_mode || "-").toLowerCase());

                this._updateCell(tr, ".cell-job-id", jInfo.job_id || "-");
                
                // Owners: join array if available
                const owners = Array.isArray(jInfo.owners) ? jInfo.owners.join(', ') : (jInfo.owners || "-");
                this._updateCell(tr, ".cell-owner", owners);

                // Schedule: combine start, end, interval
                const schedule = this._renderSchedule(jInfo);
                this._updateCell(tr, ".cell-schedule", schedule);
                
                this._updateCell(tr, ".cell-status", this._renderStatusPills(jInfo));

                tr.dataset.enriched = "true";
            }
        });
    }

    _renderSchedule(jInfo) {
        const interval = jInfo.interval || jInfo.cron || "-";
        const hasInterval = interval && interval !== "-";
        const hasDate = jInfo.start_date && jInfo.start_date !== "-";

        if (!hasInterval && !hasDate) return "-";
        
        let html = `<div class="schedule-info">`;
        if (hasInterval) {
            html += `<div class="schedule-interval">${interval}</div>`;
        }
        if (hasDate) {
            html += `<div class="schedule-range text-muted" style="font-size: 0.85em;">${jInfo.start_date} ~ ${jInfo.end_date || ''}</div>`;
        }
        html += `</div>`;
        return html;
    }

    _updateCell(row, selector, value) {
        const cell = row.querySelector(selector);
        if (cell) {
            cell.innerHTML = `<span>${value}</span>`;
            cell.classList.remove("loading-placeholder");
        }
    }

    _renderStatusPills(jInfo) {
        const status = (jInfo.status || "unknown").toLowerCase();
        const runStatus = (jInfo.run_status || "-").toLowerCase();

        let html = `<div class="status-group">`;
        if (jInfo.status && jInfo.status !== "-") {
            html += `<span class="status-pill status-${status}">${jInfo.status}</span>`;
        }
        if (jInfo.run_status && jInfo.run_status !== "-") {
            html += `<span class="status-pill status-${runStatus}">${jInfo.run_status}</span>`;
        }
        html += `</div>`;
        return html;
    }
}

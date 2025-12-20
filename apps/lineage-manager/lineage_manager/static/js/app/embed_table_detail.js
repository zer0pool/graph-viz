import { ApiClient } from "./services/api.js";
import { PanelController } from "./ui/panelControllerNew.js";
import { selectionState } from "./state.js";
import { setupDetailTabs } from "./setup/layoutSetup.js";

/**
 * Embed Table Detail Widget
 * Specialized entry point for show only table detail panel.
 * Usage: embed_table_detail.html?job_id=JOB_NAME&api_url=http://...
 *    or: embed_table_detail.html?table_name=TABLE_NAME&api_url=http://...
 */
async function init() {
    // 1. Initialize API Client
    const params = new URLSearchParams(window.location.search);
    const apiUrl = params.get("api_url");

    // Fallback for mock auth if window.authClient is missing
    const api = new ApiClient(window.authClient || {
        fetchWithAuth: async (url, options = {}) => fetch(url, options)
    }, apiUrl);

    // 2. Initialize Panel Controller
    const panel = new PanelController(api);

    // 3. Setup UI interactions (Tabs, etc)
    setupDetailTabs();

    // 4. Parse Parameters (Already done for apiUrl)
    const jobId = params.get("job_id");
    const tableName = params.get("table_name");

    const titleEl = document.getElementById("node-title");

    try {
        let targetTable = tableName;

        // 4. Resolve Table Name from Job ID
        if (jobId && !targetTable) {
            if (titleEl) titleEl.textContent = `Finding downstream table for ${jobId}...`;

            const jobDetail = await api.fetchJobDetail(jobId);

            // Logic: Find the first output table documented in the job
            if (jobDetail && jobDetail.downstreams) {
                const tables = jobDetail.downstreams.filter(d => d.type === 'table');
                if (tables.length > 0) {
                    targetTable = tables[0].name || tables[0].id;
                }
            }

            // Fallback for dummy data or older APIs
            if (!targetTable && jobDetail.destination_table) {
                targetTable = jobDetail.destination_table;
            }
        }

        // 5. Trigger Panel Update via Selection State
        if (targetTable) {
            selectionState.set({
                id: targetTable,
                type: 'table',
                source: 'widget',
                label: targetTable,
                data: {
                    type: 'table',
                    full_name: targetTable,
                    label: targetTable
                }
            });
        } else if (jobId) {
            if (titleEl) titleEl.textContent = `No output table found for job: ${jobId}`;
        } else {
            if (titleEl) titleEl.textContent = "Please provide job_id or table_name parameter.";
        }
    } catch (err) {
        console.error("Widget Error:", err);
        if (titleEl) titleEl.textContent = "Error loading table details.";
    }
}

// Start when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

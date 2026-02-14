/**
 * Embed App Entry Point
 * Simplified orchestrator for embedded mode
 * - No ListView
 * - No Navbar/Search/Filter ControlBar (uses local bindings)
 */

import { SELECTORS, readPollInterval } from "./config.js";
import { ApiClient } from "./services/api.js";
import { PanelController } from "./ui/panelControllerNew.js";
import { GraphController } from "./graph/graphControllerNew.js";
import { FilterState, SearchState, RelationState } from "./state.js";
import { setupDetailTabs, setupDetailResizer } from "./setup/layoutSetup.js";
import ResetControl from "./ui/resetControl.js";

(function bootstrap() {
    document.addEventListener("DOMContentLoaded", async () => {
        await window.authReady; // Mock auth in embed.html

        const app = new EmbedApp();
        await app.init();
    });
})();

class EmbedApp {
    async init() {
        const pollInterval = readPollInterval();
        document.body.dataset.pollInterval = String(pollInterval);

        // State
        const filterState = new FilterState();
        const searchState = new SearchState();
        const relationState = new RelationState();

        // Services
        const api = new ApiClient(window.authClient);

        // Controllers
        const panel = new PanelController(api);
        const graph = new GraphController({
            panel,
            filterState,
            relationState,
            api,
            searchState,
        });

        // Initialize Graph
        graph.init(document.querySelector(SELECTORS.graphContainer));

        // Simplified Controls
        // 1. Reset Controls (Handles reset, layout buttons, hide node)
        const resetControl = new ResetControl(graph);
        resetControl.init();

        // 2. Bind Direction Controls (Hosted in side panel)
        this.bindDirectionControls(graph, filterState, api);

        // Setup Layout
        setupDetailTabs();
        setupDetailResizer();

        // Handle URL Params (Job ID / Table Name)
        this.handleUrlParams(graph);
    }

    bindDirectionControls(graph, filterState, api) {
        // Simple direction handlers specific to embed sidebar
        const applyBtn = document.getElementById("direction-apply");
        if (applyBtn) {
            applyBtn.addEventListener("click", async () => {
                const upstream = document.getElementById("direction-upstream")?.checked;
                const downstream = document.getElementById("direction-downstream")?.checked;

                if (!upstream && !downstream) {
                    alert("Please select at least one direction.");
                    return;
                }

                const directions = [];
                if (upstream) directions.push("upstream");
                if (downstream) directions.push("downstream");

                // Get current selection
                const selectedNode = graph.selectionState?.selectedNode;
                // Note: selectionState is singleton, but graphController has helper access?
                // Actually graph.selectionState is accessible

                if (!graph.selectionState.node) {
                    alert("Please select a node first.");
                    return;
                }

                // Trigger expand logic similar to ControlBar but simplified
                const node = graph.view.getNodeById(graph.selectionState.node.id);
                if (!node) return;

                const depth = filterState.depth || 1;
                for (const dir of directions) {
                    await graph.expand(node, dir, depth);
                }
            });
        }

        // Toggle logic for direction card
        const toggle = document.getElementById("direction-toggle");
        const body = document.getElementById("direction-body");
        if (toggle && body) {
            toggle.addEventListener("click", () => {
                body.hidden = !body.hidden;
            });
        }
    }

    handleUrlParams(graph) {
        const params = new URLSearchParams(window.location.search);
        const jobId = params.get("job_id");
        const tableName = params.get("table_name") || params.get("table") || params.get("node");

        // We don't have searchControl, so we direct-call graph rendering via API
        // But wait, we need API to fetch neighbors first?
        // GraphController doesn't fetch, it renders. 
        // We'll reproduce basic search logic here or use a helper.

        if (jobId) {
            console.log("Embed: Loading job", jobId);
            this.loadGraph(graph, "job", jobId);
        } else if (tableName) {
            console.log("Embed: Loading table", tableName);
            this.loadGraph(graph, "table", tableName);
        }
    }

    async loadGraph(graph, type, label) {
        try {
            // Need to fetch data first. GraphController.renderGraph takes payload.
            // We can access API from graph.api if we want, or pass it.
            // graph.api is available.

            const depth = 1; // Default
            const payload = await graph.api.fetchNeighbors(type, label, depth);

            graph.renderGraph(payload, {
                centerLabel: label,
                rememberInitial: true,
                rememberInitialSearch: true,
                resetViewport: true,
            });
        } catch (error) {
            console.error("Embed load failed:", error);
            // Fallback
            graph.renderGraph({
                base_node: label,
                nodes: [{ id: `${type[0]}${label}`, label: label, type: type }],
                edges: [],
            }, {
                centerLabel: label,
                resetViewport: true
            });
        }
    }
}

export default EmbedApp;

/**
 * GraphController - Mermaid Adapter
 * Simplified controller for Mermaid graph manager
 */

import GraphView from './graphView.js';

export class GraphController {
    constructor({ panel, filterState, relationState, api, searchState }) {
        this.panel = panel;
        this.filterState = filterState;
        this.relationState = relationState;
        this.api = api;
        this.searchState = searchState;

        // Mermaid view
        this.view = null;
        this.initialSearchSnapshot = null;
        this.initialSearchCenterLabel = null;
    }

    /**
     * Initialize graph
     */
    init(container) {
        this.view = new GraphView(container);
        this.view.init();

        return this.view;
    }

    /**
     * Render graph - delegates to MermaidGraphManager
     */
    async renderGraph(payload, options = {}) {
        console.log('[GraphController] renderGraph called', { payload, options });

        if (this.view && this.view.mermaidManager) {
            const centerLabel = options.centerLabel || payload.center_label || payload.base_node;
            if (centerLabel) {
                // Determine node type from multiple sources
                let nodeType = options.type || payload.kind || payload.node_type;

                // If still no type, use heuristic
                if (!nodeType) {
                    nodeType = centerLabel.includes('.') ? 'table' : 'job';
                }

                const nodeId = `${nodeType}:${centerLabel}`;
                console.log('[GraphController] Loading graph:', { centerLabel, nodeType, nodeId });

                await this.view.mermaidManager.loadGraph(nodeId);

                // Store for reset
                if (options.rememberInitialSearch) {
                    this.initialSearchSnapshot = { nodeId, centerLabel };
                    this.initialSearchCenterLabel = centerLabel;
                }
            }
        }
    }

    /**
     * Reset graph view
     */
    resetGraphView() {
        if (this.view && this.view.mermaidManager) {
            if (this.initialSearchSnapshot) {
                this.view.mermaidManager.loadGraph(this.initialSearchSnapshot.nodeId);
            } else {
                this.view.mermaidManager.reset();
            }
        }
    }

    /**
     * Update toolbar visibility
     */
    updateToolbarVisibility() {
        const toolbar = document.getElementById('graph-toolbar');
        if (!toolbar) return;

        const hasGraph = this.view?.mermaidManager?.nodes?.length > 0;
        toolbar.hidden = !hasGraph;
    }

    /**
     * Stub methods for compatibility
     */
    clearSelection() {
        console.log('clearSelection - not implemented for Mermaid');
    }

    applyFilters() {
        console.log('applyFilters - not needed for Mermaid');
    }

    forceLayout() {
        console.log('forceLayout - not applicable for Mermaid');
    }

    hideNodeById() {
        console.log('hideNodeById - not implemented for Mermaid');
        return false;
    }

    resetHiddenNodes() {
        console.log('resetHiddenNodes - not needed for Mermaid');
    }

    async expand() {
        console.log('expand - handled by expand buttons');
    }

    centerOnNode() {
        console.log('centerOnNode - auto-centered in Mermaid');
    }

    resetTableTabs() {
        const tabs = document.querySelectorAll("#table_tabs .detail-tab");
        const panels = document.querySelectorAll(
            '.detail-tab-panels[data-tab-group="table"] .detail-pane'
        );

        if (!tabs.length) return;

        tabs.forEach((tab) => {
            const isOverview = (tab.dataset.tab || "overview") === "overview";
            tab.classList.toggle("active", isOverview);
            tab.setAttribute("aria-selected", isOverview ? "true" : "false");
        });

        panels.forEach((pane) => {
            const isOverview = (pane.dataset.tabPanel || "overview") === "overview";
            pane.classList.toggle("active", isOverview);
        });
    }
}

export default GraphController;

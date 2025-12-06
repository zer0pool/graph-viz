/**
 * GraphController - Orchestrator for all graph operations
 * Coordinates between view, selection, filters, positioning, and expansion
 * New lightweight version: ~150 lines (previously 799)
 */

import GraphView from "./graphView.js";
import { GraphSelection } from "./graphSelection.js";
import GraphFiltering from "./graphFiltering.js";
import GraphPersistence from "./graphPersistence.js";
import GraphPositioning from "./graphPositioning.js";
import GraphListView from "./graphListView.js";
import GraphNodeSerializer from "./graphNodeSerializer.js";
import GraphTooltip from "./graphTooltip.js";
import GraphZoomControls from "./graphZoomControls.js";
import GraphExpansion from "./graphExpansion.js";

export class GraphController {
    constructor({ panel, filterState, selectionState, relationState, api, searchState }) {
        this.panel = panel;
        this.filterState = filterState;
        this.selectionState = selectionState;
        this.relations = relationState;
        this.api = api;
        this.searchState = searchState;

        // Delegate instances
        this.view = null;
        this.selection = null;
        this.filtering = null;
        this.persistence = null;
        this.positioning = null;
        this.listView = null;
        this.tooltip = null;
        this.zoomControls = null;
        this.expansion = null;

        // Configuration
        this.graphCanvas = document.getElementById("cy");

        document.addEventListener("job-detail:view-in-graph", (event) => {
            const nodeId = event.detail?.nodeId;
            if (nodeId) this.centerOnNode(nodeId);
        });

        document.addEventListener("table-detail:view-in-graph", (event) => {
            const nodeId = event.detail?.nodeId;
            if (nodeId) this.centerOnNode(nodeId);
        });
    }

    /**
     * Initialize graph and all sub-modules
     */
    init(container) {
        // Initialize view layer
        this.view = new GraphView(container);
        this.view.init();

        // Initialize sub-modules
        this.selection = new GraphSelection(this.view);
        this.filtering = new GraphFiltering(this.view);
        this.persistence = new GraphPersistence(this.view);
        this.positioning = new GraphPositioning(this.view, this.persistence);
        this.tooltip = new GraphTooltip(this.graphCanvas);
        this.zoomControls = new GraphZoomControls(this.view);
        this.expansion = new GraphExpansion(this.view, GraphNodeSerializer);

        const listViewContainer = document.getElementById("node-list-table");
        const listViewElement = document.getElementById("list-view");
        this.listView = new GraphListView(
            this.view,
            this.graphCanvas,
            listViewElement
        );

        // Setup event bindings
        this.bindGraphEvents();
        this.bindPositionEvents();
        this.bindViewportEvents();
        this.zoomControls.bindControls();
        this.listView.bindListDownload();

        return this.view.getCy();
    }

    /**
     * Bind Cytoscape events
     */
    bindGraphEvents() {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.on("mouseover", "node", (evt) => {
            evt.target.addClass("hovered");
            this.selection.highlightNeighborhood(evt.target);
            this.tooltip.showJobTooltip(evt);
        });

        cy.on("mousemove", "node", (evt) => {
            this.tooltip.showJobTooltip(evt, true);
        });

        cy.on("mouseout", "node", (evt) => {
            evt.target.removeClass("hovered");
            if (!this.selectionState.node) this.selection.resetHighlight();
            this.tooltip.hide();
        });

        cy.on("tap", "node", (evt) => {
            const target = evt.target;
            this.selectNode(target);
            this.selection.highlightNeighborhood(target);
            this.panel.renderTriggers(target);
        });

        cy.on("tap", (evt) => {
            if (evt.target === cy) this.clearSelection();
        });

        cy.on("dbltap", "node", () => {
            document.dispatchEvent(new CustomEvent("detail-panel:toggle"));
        });
    }

    /**
     * Bind position tracking events
     */
    bindPositionEvents() {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.on("dragfree", "node", (evt) => {
            const pos = evt.target.position();
            this.persistence.setPosition(evt.target.id(), { x: pos.x, y: pos.y });
        });
    }

    /**
     * Bind viewport tracking events
     */
    bindViewportEvents() {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.on("zoom", () => this.persistence.cacheViewport());
        cy.on("pan", () => this.persistence.cacheViewport());
    }

    /**
     * Render graph from payload
     */
    renderGraph(payload, options = {}) {
        if (this.selectionState?.node) {
            this.clearSelection();
        }

        if (options.resetViewport) {
            this.persistence.clearViewport();
        }

        if (options.rememberInitial) {
            this.persistence.setBaseGraph(payload, options.centerLabel);
        }

        // Re-init view
        this.view.destroy();
        this.init(document.getElementById("cy"));

        // Serialize nodes
        const hiddenNodes = this.persistence.getHiddenNodes();
        const visibleNodes = (payload.nodes || []).filter((n) => !hiddenNodes.has(n.id));
        const nodes = visibleNodes.map((n) => GraphNodeSerializer.serialize(n));

        // Filter edges to visible nodes
        const allowedNodeIds = new Set(visibleNodes.map((n) => n.id));
        const edges = (payload.edges || [])
            .filter((e) => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target))
            .map((e) => ({
                data: {
                    id: e.id || `${e.source}_${e.target}`,
                    source: e.source,
                    target: e.target,
                    io: e.io || "",
                },
            }));

        // Render
        this.view.render(nodes, edges);

        // Position nodes
        const shouldForceLayout = !this.persistence.nodePositions.size || options.forceLayoutDirection;
        if (shouldForceLayout) {
            const direction = options.forceLayoutDirection || this.persistence.getLastLayoutDirection();
            this.positioning.forceLayout(direction, false);
        } else {
            this.persistence.applyCachedPositions();
            this.positioning.positionNodes(options.centerLabel);
            this.persistence.applyViewport();
        }

        // Setup minimap
        this.zoomControls.setupMinimap();

        // Final updates
        this.panel.setPlaceholder();
        this.applyFilters();
        this.listView.updateListView();
        this.updateToolbarVisibility();
        this.resetTableTabs();
        this.listView.setViewMode(this.listView.getViewMode());
    }

    /**
     * Select a node
     */
    selectNode(node) {
        this.selection.selectNode(node);
        this.selectionState.set(node);
        this.panel.updateMetadata(node);
        this.panel.updateRelations(node);
        this.panel.renderTriggers(node);

        if (typeof document !== "undefined") {
            document.dispatchEvent(
                new CustomEvent("detail-panel:selection", {
                    detail: { hasSelection: true },
                })
            );
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selection.clearSelection();
        this.selectionState.clear();
        this.panel.setPlaceholder();

        if (typeof document !== "undefined") {
            document.dispatchEvent(
                new CustomEvent("detail-panel:selection", {
                    detail: { hasSelection: false },
                })
            );
        }
    }

    /**
     * Apply filters
     */
    applyFilters() {
        this.filtering.applyFilters(this.filterState);
    }

    /**
     * Force layout direction (horizontal/vertical)
     */
    forceLayout(direction = "horizontal", preserveViewport = true) {
        if (!this.positioning) return;
        this.positioning.forceLayout(direction, preserveViewport);
        this.applyFilters();
        this.listView.updateListView();
        this.updateToolbarVisibility();
    }

    /**
     * Hide node
     */
    hideNodeById(nodeId) {
        const cy = this.view.getCy();
        if (!cy) return false;

        const target = typeof nodeId === "string" ? cy.$(`#${nodeId}`) : nodeId;
        if (!target || !target.nonempty()) return false;

        const id = target.id();
        this.persistence.hideNode(id);
        cy.remove(target);
        this.clearSelection();
        this.listView.updateListView();
        this.updateToolbarVisibility();

        return true;
    }

    /**
     * Reset hidden nodes
     */
    resetHiddenNodes() {
        this.persistence.clearHiddenNodes();
    }

    /**
     * Reset graph view
     */
    resetGraphView() {
        if (this.selectionState?.node) {
            this.clearSelection();
        }
        this.resetHiddenNodes();

        const baseGraph = this.persistence.getBaseGraph();
        if (baseGraph) {
            const snapshot = JSON.parse(JSON.stringify(baseGraph));
            this.renderGraph(snapshot, {
                centerLabel: this.persistence.getBaseCenterLabel(),
                resetViewport: true,
            });
        } else if (this.view.getCy()) {
            this.view.fitAndCenter();
        }

        const cy = this.view?.getCy?.();
        if (cy) {
            cy.zoom(1);
            cy.center();
        }
    }

    /**
     * Expand node
     */
    async expand(node, direction, depth) {
        const payload = await this.expansion.expand(this.api, node, direction, depth);
        const id = node.id();
        const result = this.expansion.mergeGraph(
            payload,
            id,
            direction,
            this.persistence.getHiddenNodes()
        );

        // Position new nodes
        this.positioning.positionNewRelative(
            id,
            result.upstreamAdded,
            result.downstreamAdded
        );

        const direction_val = this.persistence.getLastLayoutDirection();
        this.positioning.forceLayout(direction_val, true);
        this.applyFilters();
        this.listView.updateListView();
        this.updateToolbarVisibility();
    }

    /**
     * Update toolbar visibility
     */
    updateToolbarVisibility() {
        const toolbar = document.getElementById("graph-toolbar");
        if (!toolbar) return;

        const cy = this.view.getCy();
        const hasGraph = cy && cy.nodes().length > 0;
        toolbar.hidden = !hasGraph;

        if (!hasGraph) {
            this.zoomControls.setMinimapVisible(false);
        }
    }

    /**
     * Reset table tabs
     */
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

    /**
     * Center viewport on node id when requested from detail panel
     */
    centerOnNode(nodeId) {
        if (!nodeId || !this.view) return;
        const cy = this.view.getCy();
        if (!cy) return;

        const target = cy.$(`#${nodeId}`);
        if (!target || target.length === 0) return;

        cy.animate(
            {
                center: { eles: target },
                duration: 350,
            },
            { easing: "ease-out" }
        );

        target.addClass("pulse");
        setTimeout(() => target.removeClass("pulse"), 700);
    }
}

export default GraphController;

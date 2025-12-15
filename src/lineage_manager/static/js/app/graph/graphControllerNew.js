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
import GraphNodeSerializer from "./graphNodeSerializer.js";
import GraphTooltip from "./graphTooltip.js";
import GraphZoomControls from "./graphZoomControls.js";
import GraphExpansion from "./graphExpansion.js";

import { selectionState, lineageState } from "../state.js";

export class GraphController {
    constructor({ panel, filterState, relationState, api, searchState }) {
        this.panel = panel;
        this.filterState = filterState;
        this.selectionState = selectionState; // Use imported singleton

        this.relations = relationState;
        this.api = api;
        this.searchState = searchState;
        this.lineageState = lineageState; // Use imported singleton

        // Delegate instances
        this.view = null;
        this.selection = null;
        this.filtering = null;
        this.persistence = null;
        this.positioning = null;
        this.tooltip = null;
        this.zoomControls = null;
        this.expansion = null;
        this.initialSearchSnapshot = null;
        this.initialSearchCenterLabel = null;

        // Configuration
        this.graphCanvas = document.getElementById("cy");

        // Subscribe to shared state selection
        selectionState.subscribe((nodeData) => {
            if (nodeData && nodeData.source !== "graph") {
                // Determine if we need to load/highlight this node
                // Ideally traverse to it or select it if visible
                const cy = this.view ? this.view.getCy() : null;
                if (cy) {
                    const el = cy.$(`#${nodeData.id}`);
                    if (el && el.length > 0) {
                        this.selection.selectNode(el);
                        // Optional: Center on it?
                        // this.centerOnNode(nodeData.id); 
                    } else {
                        // Node not in graph, maybe just clear graph selection?
                        this.selection.clearSelection();
                    }
                }
            } else if (!nodeData) {
                this.selection.clearSelection();
            }
        });

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



        // Setup event bindings
        this.bindGraphEvents();
        this.bindPositionEvents();
        this.bindViewportEvents();
        this.zoomControls.bindControls();
        // this.listView.bindListDownload(); // Handled by new ListView

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
            // Check global state? For now relying on local interactions for hover
            if (!selectionState.selectedNode) this.selection.resetHighlight();
            this.tooltip.hide();
        });

        cy.on("tap", "node", (evt) => {
            const target = evt.target;

            // Handle aggregate node clicks
            if (target.data("type") === "aggregate") {
                this.expansion.handleAggregateClick(
                    target,
                    this.positioning,
                    this.persistence,
                    () => {
                        this.applyFilters();
                        this.updateToolbarVisibility();
                    },
                    this.lineageState,
                    this.selectionState
                );
                return;
            }

            // Publish Selection State
            const data = target.data();
            selectionState.set({
                id: data.id,
                type: data.type, // 'job' or 'table'
                source: "graph",
                label: data.label || data.id,
                // Ensure full_name is passed. Cytoscape data uses 'full_name' key if present.
                // data object here is node.data().
                full_name: data.full_name || data.label || data.id,
                job_id: data.job_id, // Pass job_id for jobs
                data: data // Pass full data object for reference
            });

            this.selection.selectNode(target);
            this.selection.highlightNeighborhood(target);
            // Panel update handled by PanelController subscribing to selectionState
            // this.panel.updateMetadata(target); <-- REMOVED
            // this.panel.updateRelations(target); <-- REMOVED
            // this.panel.renderTriggers(target); <-- REMOVED
            // But we might want internal visual update?
        });

        cy.on("tap", (evt) => {
            if (evt.target === cy) {
                selectionState.clear();
                this.clearSelection();
            }
        });

        cy.on("dbltap", "node", () => {
            document.dispatchEvent(new CustomEvent("detail-panel:toggle"));
        });
    }

    /**
     * Handle aggregate node click with heartbeat animation
     */
    handleAggregateClick(aggregateNode) {
        // Delegated to GraphExpansion
        this.expansion.handleAggregateClick(
            aggregateNode,
            this.positioning,
            this.persistence,
            () => {
                this.applyFilters();
                this.updateToolbarVisibility();
            },
            this.lineageState,
            this.selectionState
        );
    }

    publishGraphState() {
        const cy = this.view.getCy();
        if (!cy) return;
        const nodes = cy.nodes().map(n => n.json());
        const edges = cy.edges().map(e => e.json());
        lineageState.setGraphData(nodes, edges);
    }

    // ... (unchanged methods: bindPositionEvents, bindViewportEvents) ...
    bindPositionEvents() {
        const cy = this.view.getCy();
        if (!cy) return;
        cy.on("dragfree", "node", (evt) => {
            const pos = evt.target.position();
            this.persistence.setPosition(evt.target.id(), { x: pos.x, y: pos.y });
        });
    }

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
        if (this.selectionState.selectedNode) {
            this.clearSelection();
        }

        if (this.zoomControls) {
            this.zoomControls.unbindControls();
        }

        const helpers = {
            expansion: this.expansion,
            persistence: this.persistence,
            positioning: this.positioning,
            zoomControls: this.zoomControls,
            panel: this.panel,
            filtering: this.filtering,
            resetTableTabs: this.resetTableTabs.bind(this),
            lineageState: this.lineageState,
            selectionState: this.selectionState
        };

        this.view.renderGraph(payload, options, helpers);

        // Re-bind events to new Cytoscape instance
        this.bindGraphEvents();
        this.bindPositionEvents();
        this.bindViewportEvents();
        if (this.zoomControls) {
            this.zoomControls.bindControls();
        }

        // After render updates
        this.updateToolbarVisibility();
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
        this.updateToolbarVisibility();

        // Update Lineage State
        const currentNodes = cy.nodes().map(n => ({ id: n.id(), data: n.data() }));
        const currentEdges = cy.edges().map(e => ({ id: e.id(), data: e.data() }));
        this.lineageState.setGraphData(currentNodes, currentEdges);

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

        const baseGraph =
            this.initialSearchSnapshot ?? this.persistence.getBaseGraph();
        if (baseGraph) {
            const snapshot = JSON.parse(JSON.stringify(baseGraph));
            this.renderGraph(snapshot, {
                centerLabel:
                    this.initialSearchCenterLabel ??
                    this.persistence.getBaseCenterLabel(),
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

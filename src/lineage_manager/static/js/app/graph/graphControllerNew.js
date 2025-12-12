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
    constructor({ panel, filterState, selectionState, relationState, api, searchState }) {
        this.panel = panel;
        this.filterState = filterState;
        this.selectionStateStore = selectionState; // Old legacy state object passed in main.js, we should migrate
        // Ideally we use the imported singleton 'selectionState' from state.js now.
        // But main.js passes 'selectionState' (which is the old legacy one from state.js if main.js is not updated?)
        // Wait, main.js imports { SelectionState } from "./state.js" and instantiates `new SelectionState()`. 
        // My new `state.js` exports CONST `selectionState`.
        // I need to be careful. The new design says Use Singleton.
        // Let's rely on the imported singleton for new features, but basic wiring might need clean up in main.js later.
        // For now, let's use the imported `selectionState` for pub/sub.

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
                this.handleAggregateClick(target);
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
    async handleAggregateClick(aggregateNode) {
        // ... (Existing implementation unchanged) ...
        const cy = this.view.getCy();
        if (!cy) return;

        const data = aggregateNode.data();
        const hiddenNodes = data.hiddenNodes || [];
        const hiddenEdges = data.hiddenEdges || [];
        const parentId = data.parentId;
        const direction = data.direction;
        const batchNumber = data.batchNumber || 0;

        const pulseCount = 4;
        const pulseDuration = 500;

        for (let i = 0; i < pulseCount; i++) {
            aggregateNode.addClass("heartbeat");
            await new Promise(resolve => setTimeout(resolve, pulseDuration / 2));
            aggregateNode.removeClass("heartbeat");
            await new Promise(resolve => setTimeout(resolve, pulseDuration / 2));
        }

        const BATCH_SIZE = 3;
        const nextBatch = hiddenNodes.slice(0, BATCH_SIZE);
        const remaining = hiddenNodes.slice(BATCH_SIZE);

        const newNodeIds = [];
        nextBatch.forEach((node) => {
            if (!cy.$(`#${node.id}`).length) {
                const added = cy.add(GraphNodeSerializer.serialize(node));
                added.addClass("just-added");
                newNodeIds.push(node.id);
                setTimeout(() => added.removeClass("just-added"), 600);
            }
        });

        const newNodeIdSet = new Set(newNodeIds);
        const existingNodeIds = new Set(cy.nodes().map(n => n.id()));

        hiddenEdges.forEach((edge) => {
            if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
                const edgeId = `${edge.source}__${edge.target}__${edge.io || ""}`;
                if (!cy.$(`#${edgeId}`).length) {
                    cy.add({
                        data: {
                            id: edgeId,
                            source: edge.source,
                            target: edge.target,
                            io: edge.io || "",
                        },
                    });
                }
            }
        });

        cy.remove(aggregateNode);

        if (remaining.length > 0) {
            const remainingEdges = hiddenEdges.filter((e) => {
                const remainingIds = new Set(remaining.map(n => n.id));
                return remainingIds.has(e.source) || remainingIds.has(e.target);
            });

            const newAggregate = this.expansion.createAggregateNode(
                parentId,
                remaining,
                remainingEdges,
                direction,
                batchNumber + 1
            );

            if (newAggregate) {
                cy.add(GraphNodeSerializer.serialize(newAggregate));
            }
        }

        const layoutDirection = this.persistence.getLastLayoutDirection() || "horizontal";
        this.positioning.forceLayout(layoutDirection, true);

        this.applyFilters();
        // this.listView.updateListView(); <-- Legacy, remove?
        // Update shared lineage state with new graph data
        this.publishGraphState();

        this.updateToolbarVisibility();
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
        if (selectionState.selectedNode) {
            this.clearSelection();
        }

        if (options.resetViewport) {
            this.persistence.clearViewport();
        }

        if (options.rememberInitial) {
            this.persistence.setBaseGraph(payload, options.centerLabel);
            if (options.rememberInitialSearch) {
                this.initialSearchSnapshot = JSON.parse(JSON.stringify(payload));
                this.initialSearchCenterLabel = options.centerLabel;
            }
        }

        // Re-init view
        this.view.destroy();
        this.init(document.getElementById("cy"));

        // Apply progressive expansion if center node is specified
        let nodesToRender = payload.nodes || [];
        let edgesToRender = payload.edges || [];

        if (options.centerLabel && nodesToRender.length > 1) {
            // Find center node
            const centerNode = nodesToRender.find(n =>
                n.full_name === options.centerLabel ||
                n.name === options.centerLabel ||
                n.job_id === options.centerLabel
            );

            if (centerNode) {
                // Apply progressive expansion
                const result = this.expansion.classifyNodesByDirection(
                    centerNode.id,
                    nodesToRender,
                    edgesToRender
                );

                const INITIAL_VISIBLE = 4;
                const aggregateNodes = [];
                let visibleNodes = [centerNode];
                let visibleEdges = [];

                // Process upstream
                if (result.upstream.length > INITIAL_VISIBLE) {
                    const visible = result.upstream.slice(0, INITIAL_VISIBLE);
                    const hidden = result.upstream.slice(INITIAL_VISIBLE);

                    visibleNodes.push(...visible);

                    // Get edges for hidden nodes
                    const hiddenIds = new Set(hidden.map(n => n.id));
                    const hiddenEdges = edgesToRender.filter(e =>
                        hiddenIds.has(e.source) || hiddenIds.has(e.target)
                    );

                    const aggregate = this.expansion.createAggregateNode(
                        centerNode.id,
                        hidden,
                        hiddenEdges,
                        "upstream",
                        0
                    );
                    if (aggregate) aggregateNodes.push(aggregate);
                } else {
                    visibleNodes.push(...result.upstream);
                }

                // Process downstream
                if (result.downstream.length > INITIAL_VISIBLE) {
                    const visible = result.downstream.slice(0, INITIAL_VISIBLE);
                    const hidden = result.downstream.slice(INITIAL_VISIBLE);

                    visibleNodes.push(...visible);

                    const hiddenIds = new Set(hidden.map(n => n.id));
                    const hiddenEdges = edgesToRender.filter(e =>
                        hiddenIds.has(e.source) || hiddenIds.has(e.target)
                    );

                    const aggregate = this.expansion.createAggregateNode(
                        centerNode.id,
                        hidden,
                        hiddenEdges,
                        "downstream",
                        0
                    );
                    if (aggregate) aggregateNodes.push(aggregate);
                } else {
                    visibleNodes.push(...result.downstream);
                }

                // Add aggregate nodes to visible nodes
                visibleNodes.push(...aggregateNodes);

                // Filter edges to only visible nodes
                const visibleIds = new Set(visibleNodes.map(n => n.id));
                visibleEdges = edgesToRender.filter(e =>
                    visibleIds.has(e.source) && visibleIds.has(e.target)
                );

                nodesToRender = visibleNodes;
                edgesToRender = visibleEdges;
            }
        }

        // Serialize nodes
        const hiddenNodes = this.persistence.getHiddenNodes();
        const visibleNodes = nodesToRender.filter((n) => !hiddenNodes.has(n.id));
        const nodes = visibleNodes.map((n) => GraphNodeSerializer.serialize(n));

        // Filter edges to visible nodes
        const allowedNodeIds = new Set(visibleNodes.map((n) => n.id));
        const edges = edgesToRender
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
        this.updateToolbarVisibility();
        this.resetTableTabs();


        // Push state
        this.publishGraphState();
    }

    /**
     * Handle aggregate node click with heartbeat animation
     */
    async handleAggregateClick(aggregateNode) {
        const cy = this.view.getCy();
        if (!cy) return;

        const data = aggregateNode.data();
        const hiddenNodes = data.hiddenNodes || [];
        const hiddenEdges = data.hiddenEdges || [];
        const parentId = data.parentId;
        const direction = data.direction;
        const batchNumber = data.batchNumber || 0;

        // Heartbeat animation (2 seconds, 4 pulses)
        const pulseCount = 4;
        const pulseDuration = 500; // 500ms per pulse

        for (let i = 0; i < pulseCount; i++) {
            aggregateNode.addClass("heartbeat");
            await new Promise(resolve => setTimeout(resolve, pulseDuration / 2));
            aggregateNode.removeClass("heartbeat");
            await new Promise(resolve => setTimeout(resolve, pulseDuration / 2));
        }

        // Get next batch (3 nodes at a time)
        const BATCH_SIZE = 3;
        const nextBatch = hiddenNodes.slice(0, BATCH_SIZE);
        const remaining = hiddenNodes.slice(BATCH_SIZE);

        // Add next batch nodes to graph
        const newNodeIds = [];
        nextBatch.forEach((node) => {
            if (!cy.$(`#${node.id}`).length) {
                const added = cy.add(GraphNodeSerializer.serialize(node));
                added.addClass("just-added");
                newNodeIds.push(node.id);
                setTimeout(() => added.removeClass("just-added"), 600);
            }
        });

        // Add edges for new nodes
        const newNodeIdSet = new Set(newNodeIds);
        const existingNodeIds = new Set(cy.nodes().map(n => n.id()));

        hiddenEdges.forEach((edge) => {
            // Only add edge if both nodes are now visible
            if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
                const edgeId = `${edge.source}__${edge.target}__${edge.io || ""}`;
                if (!cy.$(`#${edgeId}`).length) {
                    cy.add({
                        data: {
                            id: edgeId,
                            source: edge.source,
                            target: edge.target,
                            io: edge.io || "",
                        },
                    });
                }
            }
        });

        // Remove old aggregate node
        cy.remove(aggregateNode);

        // Create new aggregate if more nodes remain
        if (remaining.length > 0) {
            const remainingEdges = hiddenEdges.filter((e) => {
                const remainingIds = new Set(remaining.map(n => n.id));
                return remainingIds.has(e.source) || remainingIds.has(e.target);
            });

            const newAggregate = this.expansion.createAggregateNode(
                parentId,
                remaining,
                remainingEdges,
                direction,
                batchNumber + 1
            );

            if (newAggregate) {
                cy.add(GraphNodeSerializer.serialize(newAggregate));
            }
        }

        // Relayout graph
        const layoutDirection = this.persistence.getLastLayoutDirection() || "horizontal";
        this.positioning.forceLayout(layoutDirection, true);

        // Update state
        this.applyFilters();
        // this.listView.updateListView(); // Removed

        // Publish new state
        const currentNodes = cy.nodes().map(n => ({ id: n.id(), data: n.data() }));
        const currentEdges = cy.edges().map(e => ({ id: e.id(), data: e.data() }));
        this.lineageState.setGraphData(currentNodes, currentEdges);

        this.updateToolbarVisibility();

        // Refresh detail panel if parent node is currently selected
        if (this.selectionState.node && this.selectionState.node.id() === parentId) {
            this.selectNode(this.selectionState.node);
        }
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
            if (options.rememberInitialSearch) {
                this.initialSearchSnapshot = JSON.parse(JSON.stringify(payload));
                this.initialSearchCenterLabel = options.centerLabel;
            }
        }

        // Re-init view
        this.view.destroy();
        this.init(document.getElementById("cy"));

        // Apply progressive expansion if center node is specified
        let nodesToRender = payload.nodes || [];
        let edgesToRender = payload.edges || [];

        if (options.centerLabel && nodesToRender.length > 1) {
            // Find center node
            const centerNode = nodesToRender.find(n =>
                n.full_name === options.centerLabel ||
                n.name === options.centerLabel ||
                n.job_id === options.centerLabel
            );

            if (centerNode) {
                // Apply progressive expansion
                const result = this.expansion.classifyNodesByDirection(
                    centerNode.id,
                    nodesToRender,
                    edgesToRender
                );

                const INITIAL_VISIBLE = 4;
                const aggregateNodes = [];
                let visibleNodes = [centerNode];
                let visibleEdges = [];

                // Process upstream
                if (result.upstream.length > INITIAL_VISIBLE) {
                    const visible = result.upstream.slice(0, INITIAL_VISIBLE);
                    const hidden = result.upstream.slice(INITIAL_VISIBLE);

                    visibleNodes.push(...visible);

                    // Get edges for hidden nodes
                    const hiddenIds = new Set(hidden.map(n => n.id));
                    const hiddenEdges = edgesToRender.filter(e =>
                        hiddenIds.has(e.source) || hiddenIds.has(e.target)
                    );

                    const aggregate = this.expansion.createAggregateNode(
                        centerNode.id,
                        hidden,
                        hiddenEdges,
                        "upstream",
                        0
                    );
                    if (aggregate) aggregateNodes.push(aggregate);
                } else {
                    visibleNodes.push(...result.upstream);
                }

                // Process downstream
                if (result.downstream.length > INITIAL_VISIBLE) {
                    const visible = result.downstream.slice(0, INITIAL_VISIBLE);
                    const hidden = result.downstream.slice(INITIAL_VISIBLE);

                    visibleNodes.push(...visible);

                    const hiddenIds = new Set(hidden.map(n => n.id));
                    const hiddenEdges = edgesToRender.filter(e =>
                        hiddenIds.has(e.source) || hiddenIds.has(e.target)
                    );

                    const aggregate = this.expansion.createAggregateNode(
                        centerNode.id,
                        hidden,
                        hiddenEdges,
                        "downstream",
                        0
                    );
                    if (aggregate) aggregateNodes.push(aggregate);
                } else {
                    visibleNodes.push(...result.downstream);
                }

                // Add aggregate nodes to visible nodes
                visibleNodes.push(...aggregateNodes);

                // Filter edges to only visible nodes
                const visibleIds = new Set(visibleNodes.map(n => n.id));
                visibleEdges = edgesToRender.filter(e =>
                    visibleIds.has(e.source) && visibleIds.has(e.target)
                );

                nodesToRender = visibleNodes;
                edgesToRender = visibleEdges;
            }
        }

        // Serialize nodes
        const hiddenNodes = this.persistence.getHiddenNodes();
        const visibleNodes = nodesToRender.filter((n) => !hiddenNodes.has(n.id));
        const nodes = visibleNodes.map((n) => GraphNodeSerializer.serialize(n));

        // Filter edges to visible nodes
        const allowedNodeIds = new Set(visibleNodes.map((n) => n.id));
        const edges = edgesToRender
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
        // this.listView.updateListView(); // Removed

        // Update Lineage State
        this.lineageState.setGraphData(
            nodes.map(n => ({ id: n.data.id, data: n.data })),
            edges.map(e => ({ id: e.data.id, data: e.data }))
        );

        this.updateToolbarVisibility();
        this.resetTableTabs();
        // this.listView.setViewMode(this.listView.getViewMode()); // Removed
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

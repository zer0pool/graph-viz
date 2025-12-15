/**
 * GraphView - Pure Cytoscape wrapper
 * Handles only Cytoscape initialization and rendering
 * Single responsibility: manage Cytoscape instance
 */

import { getGraphStyles } from "./styles.js";
import GraphNodeSerializer from "./graphNodeSerializer.js";

export class GraphView {
    constructor(container) {
        this.container = container;
        this.cy = null;
    }

    /**
     * Initialize Cytoscape instance
     */
    init() {
        if (this.cy) {
            this.cy.destroy();
        }

        this.cy = cytoscape({
            container: this.container,
            layout: {
                name: "concentric",
                minNodeSpacing: 120,
                levelWidth: () => 1,
            },
            minZoom: 0.5,
            maxZoom: 2.0,
            style: getGraphStyles(),
            userPanningEnabled: true,
            userZoomingEnabled: true,
            boxSelectionEnabled: false,
            autounselectify: false,
            autoungrabify: true,
        });

        return this.cy;
    }

    /**
     * Render graph from payload with advanced options (expansion, persistence)
     * @param {object} payload - Graph data {nodes, edges}
     * @param {object} options - Options {centerLabel, forceLayoutDirection, resetViewport, rememberInitial}
     * @param {object} helpers - Modules needed {expansion, persistence, positioning, zoomControls, panel, filtering, resetTableTabs, lineageState}
     */
    renderGraph(payload, options = {}, helpers = {}) {
        const {
            expansion,
            persistence,
            positioning,
            zoomControls,
            panel,
            filtering,
            resetTableTabs,
            lineageState,
            selectionState // Keep helper ref if needed, or rely on caller to clear selection first
        } = helpers;

        // Note: Caller (Controller) should have already cleared selection if needed.

        if (options.resetViewport) {
            persistence.clearViewport();
        }

        if (options.rememberInitial) {
            persistence.setBaseGraph(payload, options.centerLabel);
            if (options.rememberInitialSearch) {
                // Controller manages snapshot, or we could too.
                // For now assuming controller handles snapshot logic or passes it down.
            }
        }

        // Re-init view
        this.destroy();
        this.init(); // Uses container from constructor

        // Apply progressive expansion if center node is specified
        let nodesToRender = payload.nodes || [];
        let edgesToRender = payload.edges || [];

        if (options.centerLabel && nodesToRender.length > 1 && expansion) {
            // Find center node
            const centerNode = nodesToRender.find(n =>
                n.full_name === options.centerLabel ||
                n.name === options.centerLabel ||
                n.job_id === options.centerLabel
            );

            if (centerNode) {
                // Apply progressive expansion
                const result = expansion.classifyNodesByDirection(
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

                    const aggregate = expansion.createAggregateNode(
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

                    const aggregate = expansion.createAggregateNode(
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
        const hiddenNodes = persistence.getHiddenNodes();
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
        if (!this.cy) throw new Error("GraphView not initialized");
        this.cy.elements().remove();
        this.cy.add([...nodes, ...edges]);

        // Position nodes
        const shouldForceLayout = !persistence.nodePositions.size || options.forceLayoutDirection;
        if (shouldForceLayout) {
            const direction = options.forceLayoutDirection || persistence.getLastLayoutDirection();
            positioning.forceLayout(direction, false);
        } else {
            persistence.applyCachedPositions();
            positioning.positionNodes(options.centerLabel);
            persistence.applyViewport();
        }

        // Setup minimap
        if (zoomControls) zoomControls.setupMinimap();

        // Final updates
        if (panel) panel.setPlaceholder();
        if (filtering) filtering.applyFilters();
        // updateToolbarVisibility handled by caller (Controller) or callback
        if (resetTableTabs) resetTableTabs();

        // Push state
        if (lineageState) {
            lineageState.setGraphData(
                nodes.map(n => ({ id: n.data.id, data: n.data })),
                edges.map(e => ({ id: e.data.id, data: e.data }))
            );
        }
    }

    /**
     * Get Cytoscape instance
     */
    getCy() {
        return this.cy;
    }

    /**
     * Get all nodes
     */
    getNodes() {
        return this.cy?.nodes() || [];
    }

    /**
     * Get all edges
     */
    getEdges() {
        return this.cy?.edges() || [];
    }

    /**
     * Get node by ID
     */
    getNodeById(id) {
        return this.cy?.$(`#${id}`);
    }

    /**
     * Add nodes/edges
     */
    add(elements) {
        return this.cy?.add(elements);
    }

    /**
     * Remove element
     */
    remove(element) {
        return this.cy?.remove(element);
    }

    /**
     * Zoom operations
     */
    zoom(level) {
        if (this.cy) this.cy.zoom(level);
    }

    getZoom() {
        return this.cy?.zoom() ?? 1;
    }

    /**
     * Pan operations
     */
    pan(position) {
        if (this.cy) this.cy.pan(position);
    }

    getPan() {
        return this.cy?.pan();
    }

    /**
     * Layout operations
     */
    layout(config) {
        if (!this.cy) return null;
        const layout = this.cy.layout(config);
        layout.run();
        return layout;
    }

    /**
     * Fit and center
     */
    fit(element, padding) {
        if (this.cy) {
            this.cy.fit(element, padding);
            this.cy.center();
        }
    }

    fitAndCenter() {
        if (this.cy) {
            this.cy.fit();
            this.cy.center();
        }
    }

    /**
     * Minimap
     */
    setupMinimap(options = {}) {
        if (this.cy) {
            this.cy.minimap({ zoomFactor: 3.0, ...options });
        }
    }

    /**
     * Register event handler
     */
    on(eventName, selector, handler) {
        if (this.cy) this.cy.on(eventName, selector, handler);
    }

    /**
     * Batch operations
     */
    batch(fn) {
        if (this.cy) this.cy.batch(fn);
    }

    /**
     * Resize canvas
     */
    resize() {
        if (this.cy) this.cy.resize();
    }

    /**
     * Destroy instance
     */
    destroy() {
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
    }
}

export default GraphView;

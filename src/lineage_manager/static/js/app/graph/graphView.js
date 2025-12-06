/**
 * GraphView - Pure Cytoscape wrapper
 * Handles only Cytoscape initialization and rendering
 * Single responsibility: manage Cytoscape instance
 */

import { getGraphStyles } from "./styles.js";

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
     * Render graph with nodes and edges
     * @param {array} nodes - Serialized node objects
     * @param {array} edges - Edge objects
     */
    render(nodes, edges) {
        if (!this.cy) throw new Error("GraphView not initialized");
        this.cy.elements().remove();
        this.cy.add([...nodes, ...edges]);
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

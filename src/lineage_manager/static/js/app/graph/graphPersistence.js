/**
 * GraphPersistence - Save and restore graph state
 * Handles node positions, viewport, and node visibility persistence
 */

export class GraphPersistence {
    constructor(graphView) {
        this.view = graphView;
        this.nodePositions = new Map();
        this.viewport = null;
        this.hiddenNodes = new Set();
        this.baseGraph = null;
        this.baseCenterLabel = null;
        this.currentCenterId = null;
        this.lastLayoutDirection = "horizontal";
    }

    /**
     * Cache all node positions
     */
    cachePositions() {
        const nodes = this.view.getNodes();
        nodes.forEach((node) => {
            const pos = node.position();
            this.nodePositions.set(node.id(), { x: pos.x, y: pos.y });
        });
    }

    /**
     * Apply cached positions to current nodes
     */
    applyCachedPositions() {
        const nodes = this.view.getNodes();
        const existing = new Set(nodes.map((n) => n.id()));

        // Remove stale positions
        Array.from(this.nodePositions.keys()).forEach((id) => {
            if (!existing.has(id)) {
                this.nodePositions.delete(id);
            }
        });

        // Apply saved positions
        nodes.forEach((node) => {
            const saved = this.nodePositions.get(node.id());
            if (saved) {
                node.position(saved);
            }
        });
    }

    /**
     * Get cached position for node
     */
    getPosition(nodeId) {
        return this.nodePositions.get(nodeId);
    }

    /**
     * Set position for node
     */
    setPosition(nodeId, position) {
        this.nodePositions.set(nodeId, position);
    }

    /**
     * Clear all positions
     */
    clearPositions() {
        this.nodePositions.clear();
    }

    /**
     * Cache current viewport (zoom/pan)
     */
    cacheViewport() {
        const cy = this.view.getCy();
        if (!cy) return;

        this.viewport = {
            zoom: cy.zoom(),
            pan: cy.pan(),
        };
    }

    /**
     * Apply cached viewport
     */
    applyViewport() {
        const cy = this.view.getCy();
        if (!cy || !this.viewport) return;

        cy.zoom(this.viewport.zoom);
        cy.pan(this.viewport.pan);
    }

    /**
     * Get cached viewport
     */
    getViewport() {
        return this.viewport;
    }

    /**
     * Clear cached viewport
     */
    clearViewport() {
        this.viewport = null;
    }

    /**
     * Store base graph snapshot
     */
    setBaseGraph(graphData, centerLabel = null) {
        this.baseGraph = JSON.parse(JSON.stringify(graphData));
        this.baseCenterLabel = centerLabel;
        this.hiddenNodes.clear();
    }

    /**
     * Get stored base graph
     */
    getBaseGraph() {
        return this.baseGraph ? JSON.parse(JSON.stringify(this.baseGraph)) : null;
    }

    /**
     * Get base graph center label
     */
    getBaseCenterLabel() {
        return this.baseCenterLabel;
    }

    /**
     * Mark node as hidden
     */
    hideNode(nodeId) {
        this.hiddenNodes.add(nodeId);
        this.nodePositions.delete(nodeId);
    }

    /**
     * Check if node is hidden
     */
    isNodeHidden(nodeId) {
        return this.hiddenNodes.has(nodeId);
    }

    /**
     * Get all hidden nodes
     */
    getHiddenNodes() {
        return new Set(this.hiddenNodes);
    }

    /**
     * Clear hidden nodes
     */
    clearHiddenNodes() {
        this.hiddenNodes.clear();
    }

    /**
     * Set current center node ID
     */
    setCurrentCenterId(nodeId) {
        this.currentCenterId = nodeId;
    }

    /**
     * Get current center node ID
     */
    getCurrentCenterId() {
        return this.currentCenterId;
    }

    /**
     * Set last layout direction
     */
    setLastLayoutDirection(direction) {
        this.lastLayoutDirection = direction;
    }

    /**
     * Get last layout direction
     */
    getLastLayoutDirection() {
        return this.lastLayoutDirection;
    }
}

export default GraphPersistence;

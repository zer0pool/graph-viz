/**
 * GraphView - Mermaid Adapter
 * Replaces Cytoscape with Mermaid while maintaining the same interface
 */

class GraphView {
    constructor(container) {
        this.container = container || document.getElementById('mermaid-graph');
        this.mermaidManager = null;
    }

    init() {
        // Initialize Mermaid Manager
        if (window.MermaidGraphManager) {
            this.mermaidManager = new window.MermaidGraphManager();
            console.log('Mermaid GraphView initialized');
        } else {
            console.error('MermaidGraphManager not found');
        }
    }

    /**
     * Get Cytoscape instance (compatibility method - returns null)
     */
    getCy() {
        // Return a mock object to prevent errors
        return {
            nodes: () => ({ length: this.mermaidManager?.nodes?.length || 0, map: () => [] }),
            edges: () => ({ length: this.mermaidManager?.edges?.length || 0, map: () => [] }),
            $: () => ({ length: 0 }),
            on: () => { },
            zoom: () => { },
            center: () => { },
            animate: () => { },
            remove: () => { }
        };
    }

    /**
     * Render graph from payload
     */
    async renderGraph(payload, options = {}, helpers = {}) {
        if (!this.mermaidManager) {
            console.error('MermaidManager not initialized');
            return;
        }

        // Extract node ID from payload
        const centerLabel = options.centerLabel || payload.center_label;
        if (centerLabel) {
            await this.mermaidManager.loadGraph(centerLabel);
        }
    }

    /**
     * Fit and center view
     */
    fitAndCenter() {
        // Mermaid auto-fits, no action needed
        console.log('fitAndCenter called (no-op for Mermaid)');
    }
}

export default GraphView;

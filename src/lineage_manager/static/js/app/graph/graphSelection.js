/**
 * GraphSelection - Node selection and highlighting logic
 * Handles node selection state and neighborhood highlighting
 */

export class GraphSelection {
    constructor(graphView) {
        this.view = graphView;
        this.selectedNode = null;
    }

    /**
     * Select a node
     */
    selectNode(node) {
        this.clearSelection();
        this.selectedNode = node;
        node.addClass("selected");
    }

    /**
     * Get currently selected node
     */
    getSelectedNode() {
        return this.selectedNode;
    }

    /**
     * Check if node is selected
     */
    isSelected(node) {
        return this.selectedNode === node;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        if (this.selectedNode) {
            this.selectedNode.removeClass("selected");
        }
        this.selectedNode = null;
    }

    /**
     * Highlight neighborhood around node
     */
    highlightNeighborhood(node) {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.nodes().addClass("dimmed");
        cy.edges().addClass("dimmed");
        node.removeClass("dimmed").addClass("connected");
        node.connectedEdges().removeClass("dimmed").addClass("highlighted");
        node.connectedNodes().removeClass("dimmed").addClass("connected");
    }

    /**
     * Reset all highlighting
     */
    resetHighlight() {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.nodes().removeClass("dimmed connected pulse hovered");
        cy.edges().removeClass("dimmed highlighted");
    }
}

export default GraphSelection;

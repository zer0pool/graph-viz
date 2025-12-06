/**
 * GraphFiltering - Apply filters to nodes
 * Handles visibility filtering based on type, status, etc.
 */

export class GraphFiltering {
    constructor(graphView) {
        this.view = graphView;
    }

    /**
     * Apply filters to visible nodes
     * @param {object} filterState - Filter state with type, status, etc.
     */
    applyFilters(filterState) {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.batch(() => {
            cy.nodes().forEach((node) => {
                const type = (node.data("type") || "").toLowerCase();
                const status = (node.data("status") || "unknown").toLowerCase();

                const typePass = filterState.type === "all" || type === filterState.type;
                const statusPass = filterState.status === "all" || status === filterState.status;

                if (typePass && statusPass) {
                    node.removeClass("filtered-out");
                } else {
                    node.addClass("filtered-out");
                }
            });
        });
    }

    /**
     * Clear all filters (show all nodes)
     */
    clearFilters() {
        const cy = this.view.getCy();
        if (!cy) return;

        cy.nodes().removeClass("filtered-out");
    }
}

export default GraphFiltering;

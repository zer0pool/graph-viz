/**
 * FilterControl - Handle type, status, depth filters
 * Extracted from ControlBar (~50 lines)
 */

import { SELECTORS } from "../config.js";

export class FilterControl {
    constructor(filterState, graph) {
        this.filterState = filterState;
        this.graph = graph;
        this.elements = {
            filterType: document.querySelector(SELECTORS.filterType),
            filterStatus: document.querySelector(SELECTORS.filterStatus),
            filterDepth: document.querySelector(SELECTORS.filterDepth),
        };
    }

    init() {
        this.elements.filterType?.addEventListener("change", (e) => {
            this.filterState.setType(e.target.value);
            this.graph?.applyFilters?.();
        });

        this.elements.filterStatus?.addEventListener("change", (e) => {
            this.filterState.setStatus(e.target.value);
            this.graph?.applyFilters?.();
        });

        this.elements.filterDepth?.addEventListener("change", (e) => {
            this.filterState.setDepth(e.target.value);
            this.graph?.applyFilters?.();
        });
    }

    getState() {
        return {
            type: this.elements.filterType?.value || "",
            status: this.elements.filterStatus?.value || "",
            depth: this.elements.filterDepth?.value || "",
        };
    }

    reset() {
        if (this.elements.filterType) this.elements.filterType.value = "";
        if (this.elements.filterStatus) this.elements.filterStatus.value = "";
        if (this.elements.filterDepth) this.elements.filterDepth.value = "";

        this.filterState.clear();
        this.graph?.applyFilters?.();
    }
}

export default FilterControl;

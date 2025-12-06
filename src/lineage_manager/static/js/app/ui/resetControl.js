/**
 * ResetControl - Handle graph reset and view mode
 * Extracted from ControlBar (~60 lines)
 */

import { SELECTORS } from "../config.js";

export class ResetControl {
    constructor(graph) {
        this.graph = graph;
        this.resetButton = document.querySelector(SELECTORS.resetGraph);
        this.layoutButton = document.getElementById("layout-reset");
        this.highlightButton = document.getElementById("highlight-path");
        this.clearButton = document.getElementById("clear-selection");
        this.hideNodeButton = document.getElementById("hide-node");
    }

    init() {
        this.resetButton?.addEventListener("click", () => {
            this.graph?.resetGraphView?.();
        });

        this.layoutButton?.addEventListener("click", () => {
            this.graph?.resetGraphView?.();
        });

        this.highlightButton?.addEventListener("click", () => {
            // Future: highlight lineage path
        });

        this.clearButton?.addEventListener("click", () => {
            this.graph?.clearSelection?.();
        });

        this.hideNodeButton?.addEventListener("click", () => {
            const selectedNode = this.graph?.selection?.getSelectedNode?.();
            if (selectedNode) {
                const ok = window.confirm(`Hide "${selectedNode.data("label")}"?`);
                if (ok) {
                    this.graph?.hideNodeById?.(selectedNode.id());
                }
            }
        });
    }

    // Enable/disable buttons based on state
    setNodeSelected(hasSelection) {
        if (this.clearButton) {
            this.clearButton.disabled = !hasSelection;
        }
        if (this.hideNodeButton) {
            this.hideNodeButton.disabled = !hasSelection;
        }
    }
}

export default ResetControl;

/**
 * ResetControl - Handle graph reset and view mode
 * Extracted from ControlBar (~60 lines)
 */

import { SELECTORS } from "../config.js";

export class ResetControl {
    constructor(graph) {
        this.graph = graph;
        this.resetButton = document.querySelector(SELECTORS.resetGraph);
        this.layoutHorizontalButton = document.getElementById("layout-horizontal");
        this.layoutVerticalButton = document.getElementById("layout-vertical");
        this.highlightButton = document.getElementById("highlight-path");
        this.clearButton = document.getElementById("clear-selection");
        this.hideNodeButton = document.getElementById("hide-node");
    }

    init() {
        this.resetButton?.addEventListener("click", () => {
            this.graph?.resetGraphView?.();
        });

        const updateLayoutButtons = (direction) => {
            const active = direction === "vertical" ? "vertical" : "horizontal";
            if (this.layoutHorizontalButton) {
                const isActive = active === "horizontal";
                this.layoutHorizontalButton.classList.toggle("active", isActive);
                this.layoutHorizontalButton.setAttribute("aria-pressed", String(isActive));
            }
            if (this.layoutVerticalButton) {
                const isActive = active === "vertical";
                this.layoutVerticalButton.classList.toggle("active", isActive);
                this.layoutVerticalButton.setAttribute("aria-pressed", String(isActive));
            }
        };

        const initialDirection =
            this.graph?.persistence?.getLastLayoutDirection?.() || "horizontal";
        updateLayoutButtons(initialDirection);

        this.layoutHorizontalButton?.addEventListener("click", () => {
            this.graph?.forceLayout?.("horizontal", false);
            updateLayoutButtons("horizontal");
        });

        this.layoutVerticalButton?.addEventListener("click", () => {
            this.graph?.forceLayout?.("vertical", false);
            updateLayoutButtons("vertical");
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

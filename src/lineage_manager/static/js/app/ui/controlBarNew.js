/**
 * ControlBar (New) - Orchestrator for all UI controls
 * Refactored from 364 lines into modular architecture (~100 lines)
 * Delegates to SearchControl, FilterControl, ResetControl, DirectionControl
 */

import SearchControl from "./searchControl.js";
import FilterControl from "./filterControl.js";
import ResetControl from "./resetControl.js";

export class ControlBar {
    constructor({ api, graph, panel, filterState, searchState }) {
        this.api = api;
        this.graph = graph;
        this.panel = panel;
        this.filterState = filterState;
        this.searchState = searchState;

        // Delegate controls
        this.searchControl = new SearchControl(this.api, this.searchState, (label, type) =>
            this.handleSearch(label, type)
        );
        this.filterControl = new FilterControl(this.filterState, this.graph);
        this.resetControl = new ResetControl(this.graph);

        // Direction controls
        this.directionCard = document.getElementById("direction-card");
        this.directionToggle = document.getElementById("direction-toggle");
        this.directionBody = document.getElementById("direction-body");
        this.directionApply = document.getElementById("direction-apply");
        this.directionLabels = Array.from(
            document.querySelectorAll("[data-direction-option]")
        );
        this.directionInputs = this.directionLabels.map((label) =>
            label.querySelector("input")
        );
    }

    init() {
        this.searchControl.init();
        this.filterControl.init();
        this.resetControl.init();
        this.initDirectionControls();
        this.setupEventListeners();
    }

    /**
     * Handle search result selection
     */
    async handleSearch(label, type, context = {}) {
        if (!this.graph || !label) return;

        let targetType = type;
        let targetLabel = label;

        if (type === "owner") {
            const fallbackJob =
                context?.sampleJobId || context?.jobId || context?.label;
            if (!fallbackJob) {
                console.warn("No job found for owner selection");
                return;
            }
            targetType = "job";
            targetLabel = fallbackJob;
        }

        // Get MermaidGraphManager directly
        const mermaidManager = window.mermaidGraphManager || this.graph?.view?.mermaidManager;

        if (mermaidManager) {
            // Use Mermaid - format node_id as "type:label"
            const nodeId = `${targetType}:${targetLabel}`;
            console.log('[ControlBar] Loading Mermaid graph:', { nodeId, targetType, targetLabel });

            try {
                await mermaidManager.loadGraph(nodeId);

                // Store for reset functionality
                if (!this.graph.initialSearchSnapshot) {
                    this.graph.initialSearchSnapshot = {
                        nodeId: nodeId,
                        type: targetType,
                        label: targetLabel
                    };
                    this.graph.initialSearchCenterLabel = targetLabel;
                }
            } catch (error) {
                console.error("[ControlBar] Search error:", error);
                alert(`Failed to load graph: ${error.message}`);
            }
        } else {
            console.error('[ControlBar] MermaidGraphManager not found');
            alert('Graph manager not initialized');
        }
    }

    /**
     * Initialize direction controls (upstream/downstream/both)
     */
    initDirectionControls() {
        if (!this.directionToggle || !this.directionBody) return;

        this.directionToggle.addEventListener("click", () => {
            const isOpen = this.directionBody.hidden;
            this.directionBody.hidden = !isOpen;
        });

        // Bind option toggles (entire label is clickable)
        this.directionLabels.forEach((label, idx) => {
            const input = this.directionInputs[idx];
            if (!label || !input) return;

            label.addEventListener("click", (event) => {
                // Allow native toggling when user clicks actual checkbox
                if (event.target === input) return;
                event.preventDefault();
                this.toggleDirectionInput(input);
            });

            input.addEventListener("change", () => {
                if (!input.checked && this.getCheckedCount() === 0) {
                    input.checked = true;
                }
                this.updateDirectionOptionStates();
            });
        });

        this.updateDirectionOptionStates();

        this.directionApply?.addEventListener("click", async () => {
            const selectedDirections = Array.from(this.directionInputs).filter(input => input.checked);
            if (selectedDirections.length === 0) {
                console.warn("No direction selected");
                return;
            }

            // Get Mermaid manager
            const mermaidManager = window.mermaidGraphManager || this.graph?.view?.mermaidManager;

            if (!mermaidManager) {
                console.error('MermaidGraphManager not found');
                return;
            }

            // Check if node is selected
            if (!mermaidManager.selectedNodeId) {
                console.warn("No node selected in graph");
                alert('Please select a node in the graph first');
                return;
            }

            try {
                // Expand for each selected direction
                for (const directionInput of selectedDirections) {
                    const direction = directionInput.value; // 'upstream' or 'downstream'
                    console.log(`Expanding ${direction} from node: ${mermaidManager.selectedNodeId}`);
                    await mermaidManager.expandNode(direction);
                }

                // Store last used directions
                sessionStorage.setItem("lastDirections", selectedDirections.map(d => d.value).join(","));
            } catch (error) {
                console.error("Expand error:", error);
                alert(`Expansion failed: ${error.message}`);
            }
        });
    }

    toggleDirectionInput(input) {
        if (!input) return;
        const next = !input.checked;
        if (!next && this.getCheckedCount() === 1) {
            return;
        }
        input.checked = next;
        this.updateDirectionOptionStates();
    }

    getCheckedCount() {
        return this.directionInputs.filter((input) => input.checked).length;
    }

    updateDirectionOptionStates() {
        const checkedCount = this.getCheckedCount();
        const shouldLock = checkedCount === 1;

        this.directionLabels.forEach((label, idx) => {
            const input = this.directionInputs[idx];
            if (!label || !input) return;

            label.classList.toggle("checked", Boolean(input.checked));
            const shouldDisable = shouldLock && input.checked;
            label.classList.toggle("locked", shouldDisable);
            if (shouldDisable) {
                label.dataset.tooltip = "At least one direction must stay selected";
                label.setAttribute("aria-disabled", "true");
            } else {
                label.removeAttribute("data-tooltip");
                label.removeAttribute("aria-disabled");
            }
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for selection changes to update button states
        document.addEventListener("detail-panel:selection", (event) => {
            const hasSelection = event.detail?.hasSelection || false;
            this.resetControl.setNodeSelected(hasSelection);
        });
    }

    /**
     * Reset all controls
     */
    resetAll() {
        this.filterControl.reset();
        if (this.searchControl.input) {
            this.searchControl.input.value = "";
            this.searchControl.suggestions.hidden = true;
        }
    }
}

export default ControlBar;

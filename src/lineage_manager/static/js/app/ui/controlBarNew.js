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
    async handleSearch(label, type) {
        if (!this.graph || !label) return;

        try {
            // Call neighbors API to get the graph
            const kind = type === "job" ? "job" : "table";
            const depth = this.filterState.depth || 1;
            const payload = await this.api.fetchNeighbors(kind, label, depth);

            // Render the graph
            this.graph.renderGraph(payload, {
                centerLabel: label,
                rememberInitial: true,
                resetViewport: true,
            });
        } catch (error) {
            console.error("Search error:", error);
            // Fallback to simple node rendering
            const payload = {
                base_node: label,
                nodes: [{ id: `${type[0]}${label}`, label, type }],
                edges: [],
            };
            this.graph.renderGraph(payload, {
                centerLabel: label,
                rememberInitial: true,
                resetViewport: true,
            });
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

            // Get currently selected node from graph
            const selectedNode = this.graph?.selection?.selectedNode;
            if (!selectedNode) {
                console.warn("No node selected in graph");
                return;
            }

            try {
                // Expand for each selected direction
                const depth = this.filterState?.depth || 1;
                const nodeId = selectedNode.id();
                const nodeType = selectedNode.data("type") || "job";
                const nodeLabel = selectedNode.data("label") || nodeId;

                console.log(`Expanding node: ${nodeLabel} (${nodeType}), directions:`, selectedDirections.map(d => d.value));

                const nodeDbId = Number(nodeId?.slice(1));

                for (const directionInput of selectedDirections) {
                    const direction = directionInput.value;
                    if (typeof this.graph?.expand === "function") {
                        await this.graph.expand(selectedNode, direction, depth);
                    } else if (this.graph?.expansion) {
                        // Fallback if graph controller lacks expand helper
                        const payload = await this.api.expand({
                            node_type: nodeType,
                            direction,
                            depth: String(depth),
                            node_db_id: Number.isNaN(nodeDbId) ? undefined : nodeDbId,
                            node_id:
                                nodeType === "job"
                                    ? selectedNode.data("job_id") ||
                                      nodeLabel ||
                                      nodeId
                                    : undefined,
                            table_name:
                                nodeType === "table"
                                    ? selectedNode.data("full_name") ||
                                      nodeLabel ||
                                      nodeId
                                    : undefined,
                        });

                        const added = this.graph.expansion.mergeGraph(
                            payload,
                            nodeId,
                            direction,
                            this.graph.persistence?.getHiddenNodes?.() || new Set()
                        );
                        this.graph.positioning?.positionNewRelative?.(
                            nodeId,
                            added.upstreamAdded,
                            added.downstreamAdded
                        );
                        const dir = this.graph.persistence?.getLastLayoutDirection?.();
                        this.graph.positioning?.forceLayout?.(dir || "horizontal", true);
                        this.graph.applyFilters?.();
                        this.graph.listView?.updateListView?.();
                        this.graph.updateToolbarVisibility?.();
                    }
                }

                // Store last used directions
                sessionStorage.setItem("lastDirections", selectedDirections.map(d => d.value).join(","));
            } catch (error) {
                console.error("Expand error:", error);
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

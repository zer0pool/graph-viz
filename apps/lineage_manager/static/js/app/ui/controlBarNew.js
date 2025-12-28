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
        this.initDirectionControls(); // Side panel direction controls (upstream/downstream)
        this.initGraphDirectionControls(); // Toolbar orientation controls (TB/LR)
        this.initLayoutControls();
        this.setupEventListeners();
    }

    initGraphDirectionControls() {
        const orientationBtn = document.getElementById('orientation-btn');
        const orientationMenu = document.getElementById('orientation-menu');
        const orientationOptions = document.querySelectorAll('[data-direction]');

        if (!orientationBtn || !orientationMenu) return;

        // Toggle menu
        orientationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = orientationMenu.hidden;

            // Close all menus first
            document.getElementById('orientation-menu').hidden = true;
            document.getElementById('layout-menu').hidden = true;
            const downloadMenu = document.getElementById('download-menu');
            if (downloadMenu) downloadMenu.hidden = true;

            // Toggle this one
            orientationMenu.hidden = !isHidden;
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!orientationBtn.contains(e.target) && !orientationMenu.contains(e.target)) {
                orientationMenu.hidden = true;
            }
        });

        // Handle direction selection
        orientationOptions.forEach(option => {
            option.addEventListener('click', async () => {
                const direction = option.dataset.direction;

                // Update UI active state
                orientationOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                orientationMenu.hidden = true;

                // Update Graph
                const mermaidManager = window.mermaidGraphManager || this.graph?.view?.mermaidManager;
                if (mermaidManager) {
                    await mermaidManager.setDirection(direction);
                }
            });
        });
    }

    initLayoutControls() {
        const layoutBtn = document.getElementById('layout-btn');
        const layoutMenu = document.getElementById('layout-menu');
        const layoutOptions = document.querySelectorAll('[data-layout]');

        if (!layoutBtn || !layoutMenu) return;

        // Toggle menu
        layoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = layoutMenu.hidden;

            // Close all menus first
            document.getElementById('orientation-menu').hidden = true;
            document.getElementById('layout-menu').hidden = true;
            const downloadMenu = document.getElementById('download-menu');
            if (downloadMenu) downloadMenu.hidden = true;

            // Toggle this one
            layoutMenu.hidden = !isHidden;
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!layoutBtn.contains(e.target) && !layoutMenu.contains(e.target)) {
                layoutMenu.hidden = true;
            }
        });

        // Handle layout selection
        layoutOptions.forEach(option => {
            option.addEventListener('click', async () => {
                const layout = option.dataset.layout;

                // Update UI active state
                layoutOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                layoutMenu.hidden = true;

                // Update Button Icon
                // Hierarchical Path (Tree)
                const dagrePath = "M5 22q-1.25 0-2.125-.875T2 19q0-.975.563-1.75T4 16.175V14q0-1.25.875-2.125T7 11h4V7.825q-.875-.3-1.437-1.075T9 5q0-1.25.875-2.125T12 2t2.125.875T15 5q0 .975-.562 1.75T13 7.825V11h4q1.25 0 2.125.875T20 14v2.175q.875.3 1.438 1.075T22 19q0 1.25-.875 2.125T19 22t-2.125-.875T16 19q0-.975.563-1.75T18 16.175V14q0-.425-.288-.712T17 13h-4v3.175q.875.3 1.438 1.075T15 19q0 1.25-.875 2.125T12 22t-2.125-.875T9 19q0-.975.563-1.75T11 16.175V13H7q-.425 0-.712.288T6 14v2.175q.875.3 1.438 1.075T8 19q0 1.25-.875 2.125T5 22m0-2q.425 0 .713-.288T6 19t-.288-.712T5 18t-.712.288T4 19t.288.713T5 20m7 0q.425 0 .713-.288T13 19t-.288-.712T12 18t-.712.288T11 19t.288.713T12 20m7 0q.425 0 .713-.288T20 19t-.288-.712T19 18t-.712.288T18 19t.288.713T19 20M12 6q.425 0 .713-.288T13 5t-.288-.712T12 4t-.712.288T11 5t.288.713T12 6";

                // Adaptive Path (Structure)
                const elkPath = "M7 22q-1.25 0-2.125-.875T4 19q0-.975.563-1.75T6 16.175v-8.35q-.875-.3-1.437-1.075T4 5q0-1.25.875-2.125T7 2t2.125.875T10 5q0 .975-.562 1.75T8 7.825V8q0 1.25.875 2.125T11 11h2q2.075 0 3.538 1.463T18 16v.175q.875.3 1.438 1.075T20 19q0 1.25-.875 2.125T17 22t-2.125-.875T14 19q0-.975.563-1.75T16 16.175V16q0-1.25-.875-2.125T13 13h-2q-.85 0-1.612-.262T8 12v4.175q.875.3 1.438 1.075T10 19q0 1.25-.875 2.125T7 22m0-2q.425 0 .713-.288T8 19t-.288-.712T7 18t-.712.288T6 19t.288.713T7 20m10 0q.425 0 .713-.288T18 19t-.288-.712T17 18t-.712.288T16 19t.288.713T17 20M7 6q.425 0 .713-.288T8 5t-.288-.712T7 4t-.712.288T6 5t.288.713T7 6";

                const btnIconPath = layoutBtn.querySelector('svg path');
                if (btnIconPath) {
                    if (layout === 'elk') {
                        btnIconPath.setAttribute('d', elkPath);
                    } else {
                        btnIconPath.setAttribute('d', dagrePath);
                    }
                }

                // Update Graph
                const mermaidManager = window.mermaidGraphManager || this.graph?.view?.mermaidManager;
                if (mermaidManager) {
                    await mermaidManager.setLayout(layout);
                }
            });
        });
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

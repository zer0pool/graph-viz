import { selectionState, lineageState } from "../state.js";
import { ExcelExportService } from "../services/excelExportService.js";
import { NodeListRenderer } from "./renderers/nodeListRenderer.js";
import { ExpandedLineageRenderer } from "./renderers/expandedLineageRenderer.js";
import { LineageDetailService } from "../services/lineageDetailService.js";

class ListView {
    constructor(api, graphController) {
        this.api = api;
        // graphController is optional, mostly for "Download Current" if needed directly,
        // but ideally we rely on state. graphController might expose current elements?
        // Actually, we can get current elements from lineageState if we sync them there,
        // OR we can keep a reference to graphController to ask "what are visible nodes?".
        // For now, let's assume lineageState updates 'graphData' whenever graph changes.
        this.graphController = graphController;

        this.elements = {
            view: document.getElementById("list-view"),
            tabs: document.querySelectorAll(".list-mode-toggle .view-tab"),

            // Current List
            currentContainer: document.getElementById("list-view-current"),
            currentTableBody: document.querySelector("#node-list-table tbody"),
            downloadCurrentBtn: document.getElementById("list-download"),

            // Full Lineage - Refactored
            fullContainer: document.getElementById("list-view-full"),
            fullTreeContainer: document.getElementById("full-lineage-container"),

            // New Header Elements
            fullTitle: document.getElementById("full-lineage-title"),
            fullNotice: document.getElementById("full-lineage-notice"),
            reloadFullBtn: document.getElementById("btn-load-full-lineage"),
            downloadFullBtn: document.getElementById("btn-download-full-lineage"),
        };

        this.lineageDetailService = new LineageDetailService(this.api);
        this.nodeListRenderer = new NodeListRenderer();
        this.fullLineageRenderer = new ExpandedLineageRenderer({
            detailService: this.lineageDetailService
        });

        this.currentMode = "current";
        this.expandedNodes = new Set(); // For tree folding if implemented later

        this.bindEvents();
        this.subscribeState();
    }

    bindEvents() {
        // Tab toggle
        if (this.elements.tabs) {
            this.elements.tabs.forEach(tab => {
                tab.addEventListener("click", () => {
                    this.setMode(tab.dataset.listMode);
                });
            });
        }

        // ACTION: Reload Full Lineage
        if (this.elements.reloadFullBtn) {
            this.elements.reloadFullBtn.addEventListener("click", () => {
                this.loadFullLineage();
            });
        }

        // Download buttons
        if (this.elements.downloadCurrentBtn) {
            this.elements.downloadCurrentBtn.addEventListener("click", () => this.downloadCSV("current"));
        }
        if (this.elements.downloadFullBtn) {
            this.elements.downloadFullBtn.addEventListener("click", () => this.downloadCSV("full"));
        }

        // Row Click Delegation (Current)
        if (this.elements.currentTableBody) {
            this.elements.currentTableBody.addEventListener("click", (e) => {
                const row = e.target.closest("tr");
                if (row && row.dataset.id) {
                    const data = this.nodeDataMap?.get(row.dataset.id) || {};
                    this.selectNode(row.dataset.id, row.dataset.type, data);
                }
            });
        }

        // Tree Click Delegation (Full)
        if (this.elements.fullTreeContainer) {
            this.elements.fullTreeContainer.addEventListener("click", (e) => {
                const row = e.target.closest("tr"); // Now rows in tables
                if (row && row.dataset.id) {
                    const props = JSON.parse(decodeURIComponent(row.dataset.props || "{}"));
                    this.selectNode(row.dataset.id, row.dataset.type, {
                        id: row.dataset.id,
                        type: row.dataset.type,
                        label: row.dataset.label,
                        full_name: row.dataset.id,
                        ...props
                    });
                }
            });
        }
    }

    subscribeState() {
        // Selection Sync
        selectionState.subscribe((nodeData) => {
            if (nodeData) {
                this.highlightNode(nodeData.id);
                // Enable reload but DO NOT change title
                if (this.elements.reloadFullBtn) {
                    this.elements.reloadFullBtn.disabled = false;
                }

                // UX: Check if we need to suggest Reload
                this.checkReloadSuggestion(nodeData);
            } else {
                this.clearHighlight();
                if (this.elements.reloadFullBtn) {
                    this.elements.reloadFullBtn.disabled = true;
                }
                this.clearReloadSuggestion();
            }
        });

        // Data Sync
        lineageState.subscribe((state) => {
            if (state.graphData) {
                this.nodeDataMap = this.nodeListRenderer.render(
                    this.elements.currentTableBody,
                    state.graphData.nodes,
                    selectionState.selectedNode
                );
            }
            if (state.fullLineage) {
                this.fullLineageRenderer.render(
                    this.elements.fullTreeContainer,
                    state.fullLineage,
                    this.elements,
                    selectionState.selectedNode
                );
                this.currentRootName = this.fullLineageRenderer.currentRootName;
            }
        });
    }

    setMode(mode) {
        this.currentMode = mode;
        this.elements.tabs.forEach(t => {
            t.classList.toggle("active", t.dataset.listMode === mode);
        });

        if (mode === "current") {
            this.elements.currentContainer.hidden = false;
            this.elements.fullContainer.hidden = true;
        } else {
            this.elements.currentContainer.hidden = true;
            this.elements.fullContainer.hidden = false;
        }
    }

    /**
     * Handle global view switching (Graph vs List)
     */
    setViewMode(mode = "graph") {
        const isList = mode === "list";
        // Toggle container visibility
        if (this.elements.view) {
            this.elements.view.hidden = !isList;
        }

        // Also toggle the graph container (managed by ID usually, or we can assume it's #cy or #graph-container)
        // Ideally receiving the graph container reference would be better, but we can query it or assume standard ID.
        // GraphController manages 'cy' but maybe not the wrapper.
        // Let's grab #cy.
        const graphArea = document.getElementById("cy");
        if (graphArea) {
            graphArea.hidden = isList;
        }

        // If switching to list, ensure we have initial data rendered if empty
        if (isList) {
            // Check if we have a selection to default to Full Lineage
            if (selectionState.selectedNode) {
                this.setMode("full");
                // Auto-load if not already loaded for this node?
                // Simple check: just call loadFullLineage, it handles idempotent logic or re-fetches.
                // Better UX: Auto-load.
                this.loadFullLineage();
            } else {
                this.setMode("current");
            }
        }
    }

    selectNode(id, type, data = {}) {
        selectionState.set({
            id: id,
            type: type,
            source: "list",
            label: data.label || id,
            data: data
        });
    }

    highlightNode(id) {
        // Highlight in Current Table
        if (this.elements.currentTableBody) {
            const currentRows = this.elements.currentTableBody.querySelectorAll("tr");
            currentRows.forEach(row => {
                if (row.dataset.id === id) {
                    row.classList.add("selected");
                    // Reset animation
                    row.classList.remove("flash-highlight");
                    void row.offsetWidth; // trigger reflow
                    row.classList.add("flash-highlight");
                } else {
                    row.classList.remove("selected");
                    row.classList.remove("flash-highlight");
                }
            });
        }

        // Highlight in Full Lineage Tables
        if (this.elements.fullTreeContainer) {
            const fullRows = this.elements.fullTreeContainer.querySelectorAll("tr");
            fullRows.forEach(row => {
                if (row.dataset.id === id) {
                    row.classList.add("selected");
                    // Reset animation
                    row.classList.remove("flash-highlight");
                    void row.offsetWidth; // trigger reflow
                    row.classList.add("flash-highlight");
                } else {
                    row.classList.remove("selected");
                    row.classList.remove("flash-highlight");
                }
            });
        }
    }

    clearHighlight() {
        if (this.elements.currentTableBody) {
            this.elements.currentTableBody.querySelectorAll(".selected").forEach(el => {
                el.classList.remove("selected");
                el.classList.remove("flash-highlight");
            });
        }
        if (this.elements.fullTreeContainer) {
            this.elements.fullTreeContainer.querySelectorAll(".selected").forEach(el => {
                el.classList.remove("selected");
                el.classList.remove("flash-highlight");
            });
        }
    }

    checkReloadSuggestion(nodeData) {
        // If selected ID is different from current displayed root, suggest reload
        // nodeData.id is the full name usually (from selectNode logic)
        const selectedId = nodeData.id;
        const label = selectedId

        if (this.currentRootName && selectedId !== this.currentRootName) {
            this.showReloadSuggestion(label);
        } else {
            this.clearReloadSuggestion();
        }
    }

    showReloadSuggestion(label) {
        if (!this.elements.reloadFullBtn) return;

        // Update button tooltip
        this.elements.reloadFullBtn.title = `Reload and set focus to ${label}`;

        // Create helper text if not exists
        if (!this.elements.reloadHelper) {
            const helper = document.createElement("span");
            helper.className = "reload-helper-text";
            if (this.elements.reloadFullBtn.parentElement) {
                this.elements.reloadFullBtn.parentElement.appendChild(helper);
            }
            this.elements.reloadHelper = helper;
        }

        if (this.elements.reloadHelper) {
            this.elements.reloadHelper.innerHTML = `Focus <span style="color:#9aa0a6;">→</span> <span class="focus-target-label">${label}</span>`;
            this.elements.reloadHelper.hidden = false;
        }

        this.elements.reloadFullBtn.classList.add("btn-pulse");
    }

    clearReloadSuggestion() {
        if (!this.elements.reloadFullBtn) return;

        this.elements.reloadFullBtn.title = "Reload Full Lineage";
        this.elements.reloadFullBtn.classList.remove("btn-pulse");

        if (this.elements.reloadHelper) {
            this.elements.reloadHelper.hidden = true;
        }
    }

    async loadFullLineage() {
        const selected = selectionState.selectedNode;
        if (!selected) return;

        const hasContent = this.elements.fullTreeContainer.childElementCount > 0;
        if (hasContent) {
            this.elements.fullTreeContainer.classList.add("blur-loading");
        } else {
            this.elements.fullTreeContainer.innerHTML = '<div class="loading-state">Loading hierarchy...</div>';
        }

        this.elements.fullNotice.hidden = true;

        try {
            let fullName = null;
            let type = null;

            if (typeof selected.id === 'function') {
                fullName = selected.data('full_name') || selected.data('label') || selected.id();
                type = selected.data('type');
            } else {
                fullName = selected.data?.full_name || selected.label || selected.id;
                type = selected.type;
            }

            if (type !== "table") {
                this.elements.fullTreeContainer.classList.remove("blur-loading");
                this.elements.fullTreeContainer.innerHTML = '<div class="empty-state">Select a <strong>Table</strong> to view full lineage.</div>';
                return;
            }

            const payload = await this.api.fetchTableHierarchy(fullName);
            if (payload.status === "success") {
                this.lastFullLineageData = payload;
                lineageState.setFullLineage(payload);
                this.elements.downloadFullBtn.disabled = false;
            } else {
                throw new Error(payload.message || "Failed to load");
            }

        } catch (err) {
            console.error("Full lineage load failed", err);
            this.elements.fullTreeContainer.classList.remove("blur-loading");
            this.elements.fullTreeContainer.innerHTML = `<div class="error-state">Failed to load hierarchy: ${err.message}</div>`;
        }
    }

    // --- Rendering delegated to specialised renderers ---

    downloadCSV(mode) {
        let content = "";
        let filename = "lineage.csv";

        if (mode === "current") {
            const rows = Array.from(this.elements.currentTableBody.querySelectorAll("tr"));
            content = "ID,Type,Owner\n";
            rows.forEach(tr => {
                const id = tr.dataset.id;
                const type = tr.dataset.type;
                const owner = tr.children[2].textContent;
                content += `${id},${type},${owner}\n`;
            });
            const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Redirect full lineage export to Excel
            this.downloadExcel();
        }
    }

    downloadExcel() {
        console.debug("[ListView] downloadExcel triggered");
        if (!this.lastFullLineageData) {
            console.warn("[ListView] No lineage data available to download");
            return;
        }

        const rootNode = selectionState.selectedNode;
        let rootName = "Unknown";

        if (rootNode) {
            // Handle both plain objects and Cytoscape/function-based objects
            if (typeof rootNode.id === 'function') {
                rootName = rootNode.data('label') || rootNode.id();
            } else {
                rootName = rootNode.label || rootNode.id || "Unknown";
            }
        }

        console.debug(`[ListView] Downloading Excel for root: ${rootName}`);

        try {
            ExcelExportService.downloadLineageExcel(
                this.lastFullLineageData,
                rootName,
                this.lineageDetailService.cache
            );
            console.debug("[ListView] Excel export service called successfully");
        } catch (e) {
            console.error("[ListView] Excel export failed", e);
        }
    }
}

export default ListView;

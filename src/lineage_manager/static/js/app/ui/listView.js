import { selectionState, lineageState } from "../state.js";
import { LineageTreeUtils } from "../utils/lineageTreeUtils.js";
import { ExcelExportService } from "../services/excelExportService.js";

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

        this.currentMode = "current";
        this.expandedNodes = new Set(); // For tree folding if implemented later

        this.bindEvents();
        this.subscribeState();
    }

    bindEvents() {
        // Tab toggle
        this.elements.tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                this.setMode(tab.dataset.listMode);
            });
        });

        // ACTION: Reload Full Lineage
        if (this.elements.reloadFullBtn) {
            this.elements.reloadFullBtn.addEventListener("click", () => {
                this.loadFullLineage();
            });
        }

        // Download buttons
        this.elements.downloadCurrentBtn.addEventListener("click", () => this.downloadCSV("current"));
        if (this.elements.downloadFullBtn) {
            this.elements.downloadFullBtn.addEventListener("click", () => this.downloadCSV("full"));
        }

        // Row Click Delegation (Current)
        this.elements.currentTableBody.addEventListener("click", (e) => {
            const row = e.target.closest("tr");
            if (row && row.dataset.id) {
                const data = this.nodeDataMap?.get(row.dataset.id) || {};
                this.selectNode(row.dataset.id, row.dataset.type, data);
            }
        });

        // Tree Click Delegation (Full)
        // Card layout might change structure, but we rely on bubbling.
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

    subscribeState() {
        // Selection Sync
        selectionState.subscribe((nodeData) => {
            if (nodeData) {
                this.highlightNode(nodeData.id);
                // Enable reload but DO NOT change title
                this.elements.reloadFullBtn.disabled = false;

                // UX: Check if we need to suggest Reload
                this.checkReloadSuggestion(nodeData);
            } else {
                this.clearHighlight();
                this.elements.reloadFullBtn.disabled = true;
                this.clearReloadSuggestion();
            }
        });

        // Data Sync
        lineageState.subscribe((state) => {
            if (state.graphData) {
                this.renderCurrentNodes(state.graphData.nodes);
            }
            if (state.fullLineage) {
                this.renderFullLineage(state.fullLineage);
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

        // Highlight in Full Lineage Tables
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

    clearHighlight() {
        this.elements.currentTableBody.querySelectorAll(".selected").forEach(el => {
            el.classList.remove("selected");
            el.classList.remove("flash-highlight");
        });
        this.elements.fullTreeContainer.querySelectorAll(".selected").forEach(el => {
            el.classList.remove("selected");
            el.classList.remove("flash-highlight");
        });
    }

    /**
     * Updates the Full Lineage Title based on the loaded root node, NOT selection.
     */
    updateFullLineageTitle(label) {
        this.currentRootName = label; // Store for comparison
        if (label) {
            // User requested Pill/Chip style for the name
            this.elements.fullTitle.innerHTML = `Full Lineage — <span class="param-chip">${label}</span>`;

            this.elements.fullNotice.hidden = true;
            this.elements.downloadFullBtn.disabled = false;
        } else {
            this.elements.fullTitle.textContent = "Full Lineage";
            this.elements.fullNotice.textContent = "Select a table to view lineage.";
            this.elements.fullNotice.hidden = false;
            this.elements.downloadFullBtn.disabled = true;
        }

        // When title updates (fresh load), clear suggestions
        this.clearReloadSuggestion();
    }

    checkReloadSuggestion(nodeData) {
        // If selected ID is different from current displayed root, suggest reload
        // nodeData.id is the full name usually (from selectNode logic)
        const selectedId = nodeData.id;
        const label = nodeData.label || selectedId; // Use label or ID for display

        if (this.currentRootName && selectedId !== this.currentRootName) {
            this.showReloadSuggestion(label);
        } else {
            this.clearReloadSuggestion();
        }
    }

    showReloadSuggestion(label) {
        // Update button tooltip
        this.elements.reloadFullBtn.title = `Reload and set focus to ${label}`;

        // Create helper text if not exists
        if (!this.elements.reloadHelper) {
            const helper = document.createElement("span");
            helper.className = "reload-helper-text";
            // Insert AFTER the button group (the parent of buttons is .full-lineage-actions)
            // Actually elements.reloadFullBtn is inside .full-lineage-actions.
            // Let's append to that container.
            this.elements.reloadFullBtn.parentElement.appendChild(helper);
            this.elements.reloadHelper = helper;
        }

        this.elements.reloadHelper.innerHTML = `Focus <span style="color:#9aa0a6;">→</span> <span class="focus-target-label">${label}</span>`;
        this.elements.reloadHelper.hidden = false;

        this.elements.reloadFullBtn.classList.add("btn-pulse");
    }

    clearReloadSuggestion() {
        this.elements.reloadFullBtn.title = "Reload Full Lineage"; // Restore default title
        this.elements.reloadFullBtn.classList.remove("btn-pulse");
    }

    /**
     * Deprecated: Old method mixed with selection. 
     * Kept internal logic split now.
     */
    async loadFullLineage() {
        const selected = selectionState.selectedNode;
        if (!selected) return;

        // Visual Effect: If we have content, blur it. If empty, show loading text.
        const hasContent = this.elements.fullTreeContainer.childElementCount > 0;
        if (hasContent) {
            this.elements.fullTreeContainer.classList.add("blur-loading");
        } else {
            this.elements.fullTreeContainer.innerHTML = '<div class="loading-state">Loading hierarchy...</div>';
        }

        this.elements.fullNotice.hidden = true; // Hide notice while loading content

        try {
            // Determine full name
            let fullName = null;
            let type = null;

            if (typeof selected.data === 'function') {
                // Cytoscape node
                fullName = selected.data('full_name') || selected.data('label') || selected.id();
                type = selected.data('type');
            } else {
                // Plain object
                fullName = selected.data?.full_name || selected.label || selected.id;
                type = selected.type;
            }

            if (type !== "table") {
                this.elements.fullTreeContainer.classList.remove("blur-loading"); // Reset if error/invalid
                this.elements.fullTreeContainer.innerHTML = '<div class="empty-state">Select a <strong>Table</strong> to view full lineage.</div>';
                return;
            }

            const payload = await this.api.fetchTableHierarchy(fullName);
            if (payload.status === "success") {
                lineageState.setFullLineage(payload); // Will trigger render via subscribe
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

    renderCurrentNodes(nodes) {
        if (!nodes) return;

        const tbody = this.elements.currentTableBody;
        tbody.innerHTML = "";

        // Sort by ID or Name
        const sorted = [...nodes].sort((a, b) => {
            const na = a.data?.label || a.data?.id || "";
            const nb = b.data?.label || b.data?.id || "";
            return na.localeCompare(nb);
        });

        // Store data map for click handling if needed, or attach to DOM
        this.nodeDataMap = new Map();

        sorted.forEach(node => {
            const data = node.data;
            if (!data || data.id === "visual_anchor") return; // Skip dummy

            this.nodeDataMap.set(data.id, data);

            const tr = document.createElement("tr");
            tr.dataset.id = data.id;
            tr.dataset.type = data.type; // job or table

            // Should match graph selection
            // Handles both Cytoscape node object (check via .id() method) and plain object (.id property)
            const selectedId = selectionState.selectedNode ?
                (typeof selectionState.selectedNode.id === 'function' ? selectionState.selectedNode.id() : selectionState.selectedNode.id)
                : null;

            if (selectedId === data.id) {
                tr.classList.add("selected");
            }

            const nameTd = document.createElement("td");
            nameTd.textContent = data.label || data.id;

            const typeTd = document.createElement("td");
            typeTd.innerHTML = `<span class="badge ${data.type}">${data.type}</span>`;

            const ownerTd = document.createElement("td");
            ownerTd.textContent = data.owner || "-";

            const updatedTd = document.createElement("td");
            updatedTd.textContent = "-";

            tr.append(nameTd, typeTd, ownerTd, updatedTd);
            tbody.append(tr);
        });
    }

    renderFullLineage(data) {
        this.lastFullLineageData = data;

        // Determine Root Node Name (depth === 0)
        let rootName = null;
        const findRoot = (list) => list ? list.find(item => item.depth === 0) : null;
        const rootItem = findRoot(data.upstream) || findRoot(data.downstream);
        if (rootItem) {
            rootName = rootItem.id; // Correct fully qualified name
        }

        // Update Title based on loaded data, not selection
        this.updateFullLineageTitle(rootName);

        const container = this.elements.fullTreeContainer;
        container.innerHTML = "";

        // Helper to create Card Section aka "APA Table Container"
        const createApaTable = (directionLabel, jobColHeader, items, tableIndex) => {
            const card = document.createElement("div");
            card.className = "lineage-card";

            // Use existing card structure but inner content will be APA style
            const count = items ? items.length : 0;
            // Removed standard card header to focus on APA title style inside body? 
            // Or keep card for container/border? User wants "Table 1..."
            // Let's keep the card container for layout but maybe simplify the header.
            // Actually, APA tables usually stand alone. But fitting into our UI (Card), let's put the title inside the card body.
            // We can remove the "lineage-card-header" or make it minimal.
            // Let's keep it consistent with previous step for container, but satisfy the Title requirement.

            const body = document.createElement("div");
            body.className = "lineage-card-body apa-container";

            if (!items || items.length === 0) {
                body.innerHTML = '<div class="muted-text" style="padding:12px;">None</div>';
                card.appendChild(body);
                return card;
            }

            // Use LineageTreeUtils to build the tree structure
            const tableItems = LineageTreeUtils.buildFlatTree(items);

            // Unified Title: Table X. Title
            const titleDiv = document.createElement("div");
            titleDiv.className = "apa-table-label"; // Re-using label class which is bold
            titleDiv.textContent = `${directionLabel}`;
            body.appendChild(titleDiv);

            const table = document.createElement("table");
            table.className = "apa-table";

            // Columns: Table Name | Via Job (Dynamic) | Depth | Owner | Info
            const thead = document.createElement("thead");
            thead.innerHTML = `
                <tr>
                    <th>Table Name</th>
                    <th>${jobColHeader}</th>
                    <th style="width: 60px;">Depth</th>
                    <th>Owner</th>
                    <th>Info</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            let tableCount = 0;
            let jobCount = 0;

            tableItems.forEach(item => {
                tableCount++;
                const tr = document.createElement("tr");
                tr.dataset.id = item.id;
                tr.dataset.type = item.type.toLowerCase();
                tr.dataset.label = item.name;

                // Keep props in dataset 
                const tProps = item.properties || {};
                const owner = tProps.owner || "-";
                const info = tProps.description || tProps.table_type || "-";
                tr.dataset.props = encodeURIComponent(JSON.stringify(tProps));

                // Calculate Logical Table Depth
                // Backend returns graph depth (Table->Job->Table = 2 hops)
                // We want Table->Table = 1 "Depth"
                const logicalDepth = Math.floor(item.depth / 2);

                const indentPadding = logicalDepth * 20;

                // Find Connected Job
                let jobName = "-";
                let jobStatusPill = "";

                if (item.parent) {
                    const parentNode = items.find(p => p.id === item.parent || p.name === item.parent);
                    if (parentNode && parentNode.type && parentNode.type.toLowerCase() === "job") {
                        jobCount++;
                        jobName = parentNode.name;
                        const jProps = parentNode.properties || {};
                        const status = jProps.status || jProps.run_status || "unknown";
                        jobStatusPill = `<span class="status-pill status-${status.toLowerCase()}">${status}</span>`;
                    }
                }

                if (selectionState.selectedNode && selectionState.selectedNode.id === item.id) {
                    tr.classList.add("selected");
                }

                if (item.depth === 0) tr.classList.add("depth-root-row");

                // Icon selection
                // Simple Circle: &#9679; (Black Circle) or CSS shape
                // User asked for "small circle icon or table icon".
                // Reverted icon as per user request.
                // Highlight Root Table Name with a distinct badge/capsule style.
                // User requested FULL table name. item.id contains the full_name.
                let nameHtml = `<span class="node-label-text">${item.id}</span>`;

                if (item.depth === 0) {
                    nameHtml = `<span class="root-table-badge">${item.id}</span>`;
                }

                // Strict Left Align for Root Row (No inline padding overrides, use CSS default)
                // For children, apply indentation. 
                // Strict Left Align for Root Row
                const cellStyle = (item.depth === 0) ? '' : 'style="font-family: monospace;"'; // Monospace for alignment

                const prefixHtml = item.depth === 0 ? '' : `<span style="color: #94a3b8; font-family: monospace; font-size: 14px; white-space: pre; margin-right: 2px;">${item.treePrefix}</span>`;

                tr.innerHTML = `
                    <td title="${item.name}">
                        <div style="display: flex; align-items: center;">
                           ${prefixHtml}
                           ${nameHtml}
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${jobName}</span>
                            ${jobStatusPill}
                        </div>
                    </td>
                    <td>${logicalDepth}</td>
                    <td>${owner}</td>
                    <td>${info}</td>
                `;
                tbody.appendChild(tr);
            });

            // TOTAL ROW (Simplified & Right Aligned)
            const totalTr = document.createElement("tr");
            totalTr.className = "apa-total-row";
            totalTr.innerHTML = `
                <td colspan="5" style="text-align: right; padding-right: 12px; color: #444; font-weight: 600;">
                    Total — Tables: ${tableCount} • Jobs: ${jobCount}
                </td>
            `;
            tbody.appendChild(totalTr);

            table.appendChild(tbody);
            body.appendChild(table);
            card.appendChild(body);
            return card;
        };

        // Use LineageTreeUtils for counting
        if (data.upstream && data.upstream.length > 0) {
            const c = LineageTreeUtils.getCounts(data.upstream);
            container.appendChild(createApaTable(`Upstream (${c.t} tables / ${c.j} jobs)`, "Created By Job", data.upstream, 1));
        }

        if (data.downstream && data.downstream.length > 0) {
            const c = LineageTreeUtils.getCounts(data.downstream);
            container.appendChild(createApaTable(`Downstream (${c.t} tables / ${c.j} jobs)`, "Used By Job", data.downstream, 2));
        }

        // If no data, show empty state
        if ((!data.upstream || data.upstream.length === 0) && (!data.downstream || data.downstream.length === 0)) {
            container.innerHTML = '<div class="empty-state">No lineage data available.</div>';
        }

        // 3. Footer Note (Subtle)
        const footer = document.createElement("div");
        footer.className = "lineage-footer-note";
        const dateStr = new Date().toISOString().split('T')[0];
        footer.innerHTML = `
            <div class="footer-separator"></div>
            <span>Note: Generated from analysis at ${dateStr}.</span>
        `;
        container.appendChild(footer);

        // Remove blur with a slight delay to trigger transition
        if (container.classList.contains("blur-loading")) {
            setTimeout(() => {
                container.classList.remove("blur-loading");
            }, 200);
        }
    }

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
        if (!this.lastFullLineageData) return;

        const rootNode = selectionState.selectedNode;
        const rootName = rootNode ? (rootNode.label || rootNode.id) : "Unknown";

        ExcelExportService.downloadLineageExcel(this.lastFullLineageData, rootName);
    }
}

export default ListView;

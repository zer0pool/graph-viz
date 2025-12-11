import { selectionState, lineageState } from "../state.js";

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

            // Full Lineage
            fullContainer: document.getElementById("list-view-full"),
            fullTreeContainer: document.getElementById("full-lineage-container"),
            loadFullBtn: document.getElementById("btn-load-full-lineage"),
            downloadFullBtn: document.getElementById("btn-download-full-lineage"),
            fullTargetLabel: document.getElementById("full-lineage-target-label"),
        };

        this.currentMode = "current"; // "current" | "full"
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

        // Load Full Lineage
        this.elements.loadFullBtn.addEventListener("click", () => {
            this.loadFullLineage();
        });

        // Download buttons
        this.elements.downloadCurrentBtn.addEventListener("click", () => this.downloadCSV("current"));
        this.elements.downloadFullBtn.addEventListener("click", () => this.downloadCSV("full"));

        // Row Click Delegation (Current)
        this.elements.currentTableBody.addEventListener("click", (e) => {
            const row = e.target.closest("tr");
            if (row && row.dataset.id) {
                this.selectNode(row.dataset.id, row.dataset.type);
            }
        });

        // Tree Click Delegation (Full)
        this.elements.fullTreeContainer.addEventListener("click", (e) => {
            const row = e.target.closest(".tree-row");
            if (row && row.dataset.id) {
                this.selectNode(row.dataset.id, row.dataset.type);
            }
        });
    }

    subscribeState() {
        // Selection Sync
        selectionState.subscribe((nodeData) => {
            if (nodeData) {
                this.highlightNode(nodeData.id);
                this.updateFullLineageTargetLabel(nodeData);
            } else {
                this.clearHighlight();
                this.updateFullLineageTargetLabel(null);
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

    selectNode(id, type) {
        selectionState.set({
            id: id,
            type: type,
            source: "list",
            label: id // Or fetch label from DOM
        });
    }

    highlightNode(id) {
        // Highlight in Current Table
        const currentRows = this.elements.currentTableBody.querySelectorAll("tr");
        currentRows.forEach(row => {
            if (row.dataset.id === id) row.classList.add("selected");
            else row.classList.remove("selected");
        });

        // Highlight in Full Tree
        const treeRows = this.elements.fullTreeContainer.querySelectorAll(".tree-row");
        treeRows.forEach(row => {
            if (row.dataset.id === id) row.classList.add("selected");
            else row.classList.remove("selected");
        });
    }

    clearHighlight() {
        this.elements.currentTableBody.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
        this.elements.fullTreeContainer.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    }

    updateFullLineageTargetLabel(node) {
        if (node) {
            this.elements.fullTargetLabel.textContent = `for ${node.label || node.id}`;
            this.elements.loadFullBtn.disabled = false;
        } else {
            this.elements.fullTargetLabel.textContent = "Select a node first";
            this.elements.loadFullBtn.disabled = true;
        }
    }

    async loadFullLineage() {
        const selected = selectionState.selectedNode;
        if (!selected) return;

        this.elements.fullTreeContainer.innerHTML = '<div class="loading-state">Loading hierarchy...</div>';

        try {
            // Determine full name - if graph node has special data structure, extracting name might vary.
            // Assuming ID is enough or label is full name for tables? 
            // For jobs, id is job_id. For tables, full_name is expected.
            // Let's rely on selectionState providing a useful identifier.
            // If it's a table, we use its ID (which usually is full_name or mapped).
            // NOTE: Backend API expects table_name. Jobs might not work on this specific endpoint yet 
            // if it's strictly /tables/.../hierarchy. 
            // Spec implies "Select Table/Job", but endpoint is /tables/.../hierarchy.
            // Let's assume for now it works for tables, or jobs if we add logic.
            // Ideally backend service should handle both or we have /jobs/.../hierarchy.
            // The python code I wrote: `uow.tables.get_by_full_name(table_name)`. So it ONLY supports tables currently.

            if (selected.type !== "table") {
                alert("Full lineage hierarchy is currently supported for Tables only.");
                this.elements.fullTreeContainer.innerHTML = '<div class="empty-state">Select a <strong>Table</strong> to view full lineage.</div>';
                return;
            }

            const payload = await this.api.fetchTableHierarchy(selected.id); // selected.id should be full_name for tables
            if (payload.status === "success") {
                lineageState.setFullLineage(payload); // Will trigger render via subscribe
                this.elements.downloadFullBtn.disabled = false;
            } else {
                throw new Error(payload.message || "Failed to load");
            }

        } catch (err) {
            console.error("Full lineage load failed", err);
            this.elements.fullTreeContainer.innerHTML = `<div class="error-state">Failed to load hierarchy: ${err.message}</div>`;
        }
    }

    renderCurrentNodes(nodes) {
        // nodes is Cytoscape collection or array of data?
        // GraphController usually maintains cy instance. 
        // If lineageState.graphData is array of node data objects:

        if (!nodes) return;

        const tbody = this.elements.currentTableBody;
        tbody.innerHTML = "";

        // Sort by ID or Name
        const sorted = [...nodes].sort((a, b) => {
            const na = a.data?.label || a.data?.id || "";
            const nb = b.data?.label || b.data?.id || "";
            return na.localeCompare(nb);
        });

        sorted.forEach(node => {
            const data = node.data;
            if (!data || data.id === "visual_anchor") return; // Skip dummy

            const tr = document.createElement("tr");
            tr.dataset.id = data.id;
            tr.dataset.type = data.type; // job or table

            // Should match graph selection
            if (selectionState.selectedNode && selectionState.selectedNode.id === data.id) {
                tr.classList.add("selected");
            }

            const nameTd = document.createElement("td");
            nameTd.textContent = data.label || data.id;

            const typeTd = document.createElement("td");
            typeTd.innerHTML = `<span class="badge ${data.type}">${data.type}</span>`;

            const ownerTd = document.createElement("td");
            ownerTd.textContent = data.owner || "-"; // Cytoscape data might not have owner unless piped

            const updatedTd = document.createElement("td");
            updatedTd.textContent = "-"; // Graph data usually minimal

            tr.append(nameTd, typeTd, ownerTd, updatedTd);
            tbody.append(tr);
        });
    }

    renderFullLineage(data) {
        const container = this.elements.fullTreeContainer;
        container.innerHTML = "";

        // Structure: UPSTREAM section, DOWNSTREAM section
        // Helper to render recursion/list

        const createSection = (title, items) => {
            const section = document.createElement("div");
            section.className = "lineage-section";

            const header = document.createElement("h4");
            header.textContent = title;
            section.appendChild(header);

            if (!items || items.length === 0) {
                const empty = document.createElement("div");
                empty.className = "muted-text";
                empty.textContent = "None";
                section.appendChild(empty);
                return section;
            }

            // Items are flat list with depth. We render them in order (they come BFS/sorted from backend?)
            // Backend BFS returns locally sorted by encounter, so loosely depth-sorted.
            // Let's sort by depth first to be safe, though tree structure implies parent-child order.
            // Simple approach: Render flat list with indentation = depth * 20px.

            const list = document.createElement("div");
            list.className = "tree-list";

            items.forEach(item => {
                const row = document.createElement("div");
                row.className = "tree-row";
                row.dataset.id = item.id; // full_name or job_id
                row.dataset.type = item.type.toLowerCase();

                // Indentation
                // const indent = item.depth * 20;
                // row.style.paddingLeft = `${indent}px`;

                // Better visual: Spacer divs
                const spacer = document.createElement("span");
                spacer.className = "tree-spacer";
                spacer.style.width = `${item.depth * 24}px`;
                spacer.innerHTML = item.depth > 0 ? '└─' : '';

                const content = document.createElement("span");
                content.className = "tree-content";

                const badge = document.createElement("span");
                badge.className = `badge ${item.type.toLowerCase()}`;
                badge.textContent = item.type[0]; // T or J

                const label = document.createElement("span");
                label.className = "tree-label";
                label.textContent = item.name;

                content.append(badge, label);
                row.append(spacer, content);

                if (selectionState.selectedNode && selectionState.selectedNode.id === item.id) {
                    row.classList.add("selected");
                }

                list.appendChild(row);
            });

            section.appendChild(list);
            return section;
        };

        container.appendChild(createSection("Upstream", data.upstream));
        container.appendChild(document.createElement("hr"));
        container.appendChild(createSection("Downstream", data.downstream));
    }

    downloadCSV(mode) {
        let content = "";
        let filename = "lineage.csv";

        if (mode === "current") {
            // Download from table
            const rows = Array.from(this.elements.currentTableBody.querySelectorAll("tr"));
            content = "ID,Type,Owner\n";
            rows.forEach(tr => {
                const id = tr.dataset.id;
                const type = tr.dataset.type;
                const owner = tr.children[2].textContent;
                content += `${id},${type},${owner}\n`;
            });
            filename = "current_graph_nodes.csv";
        } else {
            // Full Lineage from state
            const data = lineageState.fullLineage;
            if (!data) return;

            content = "Direction,Depth,Type,Name,Parent\n";
            (data.upstream || []).forEach(item => {
                content += `Upstream,${item.depth},${item.type},${item.name},${item.parent || ''}\n`;
            });
            (data.downstream || []).forEach(item => {
                content += `Downstream,${item.depth},${item.type},${item.name},${item.parent || ''}\n`;
            });
            filename = "full_lineage_hierarchy.csv";
        }

        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export default ListView;

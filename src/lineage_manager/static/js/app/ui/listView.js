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
                    full_name: row.dataset.label,
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
            // Maybe trigger a render update if needed?
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
            if (row.dataset.id === id) row.classList.add("selected");
            else row.classList.remove("selected");
        });

        // Highlight in Full Lineage Tables
        const fullRows = this.elements.fullTreeContainer.querySelectorAll("tr");
        fullRows.forEach(row => {
            if (row.dataset.id === id) row.classList.add("selected");
            else row.classList.remove("selected");
        });
    }

    clearHighlight() {
        this.elements.currentTableBody.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
        this.elements.fullTreeContainer.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    }

    updateFullLineageTargetLabel(node) {
        // Update Title: "Full Lineage — [Name]"
        if (node) {
            // Cytoscape node or plain object?
            const label = typeof node.data === 'function' ? node.data('label') : (node.label || node.data?.label || node.id);
            this.elements.fullTitle.textContent = `Full Lineage — ${label}`;

            // Update Notice
            this.elements.fullNotice.textContent = `for ${label}`;
            this.elements.fullNotice.hidden = false;

            this.elements.reloadFullBtn.disabled = false;
        } else {
            this.elements.fullTitle.textContent = "Full Lineage";
            this.elements.fullNotice.textContent = "Select a table to view lineage.";
            this.elements.reloadFullBtn.disabled = true;
            this.elements.downloadFullBtn.disabled = true;
        }
    }

    async loadFullLineage() {
        const selected = selectionState.selectedNode;
        if (!selected) return;

        this.elements.fullTreeContainer.innerHTML = '<div class="loading-state">Loading hierarchy...</div>';
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
        const container = this.elements.fullTreeContainer;
        container.innerHTML = "";

        // Helper to create Card Section aka "APA Table Container"
        const createApaTable = (directionLabel, items, tableIndex) => {
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

            // 1. Convert List to Tree (Map ID -> Node with children)
            // Backend returns a BFS list where each node appears once.
            // We use 'parent' field to reconstruct hierarchy.
            const idMap = new Map();
            const roots = [];

            // Initialize map
            items.forEach(item => {
                // clone to avoid mutating original if reused
                idMap.set(item.name, { ...item, children: [] });
            });

            // Build Tree
            items.forEach(item => {
                const node = idMap.get(item.name);
                if (item.depth === 0) {
                    roots.push(node);
                } else if (item.parent) {
                    const parent = idMap.get(item.parent);
                    if (parent) {
                        parent.children.push(node);
                    } else {
                        // Parent not in this list (maybe filtered out?), treat as quasi-root or orphan
                        // But for Upstream/Downstream lists, parent should exist unless it's the anchor via Job.
                        // Wait, 'parent' in data is the *immediate* parent (Job or Table).
                        // If Table->Job->Table, the backend logic sets 'parent' to the immediate predecessor name.
                        // Graph Service: result_list.append(..., "parent": parent_name)
                        // This seems correct.
                        // However, if we skip Jobs in display, we logic might get tricky.
                        // But here 'items' contains Jobs AND Tables? 
                        // Let's check filter below.
                        // Ah, the original code had: const tableItems = items.filter(...)
                        // If we filter items FIRST, we break the parent links (Table -> Job -> Table).
                        // WE MUST BUILD TREE WITH ALL ITEMS, THEN FLATTEN, THEN FILTER.
                    }
                }
            });

            // 2. DFS Flatten with Lines
            const flatList = [];

            // recursive helper
            const traverse = (nodes, prefix = "", isLastChild = false) => {
                nodes.forEach((node, index) => {
                    const isLast = index === nodes.length - 1;

                    // Determine current node's marker
                    // ├─ for middle, └─ for last
                    // If depth 0, no marker
                    let marker = "";
                    let childPrefix = prefix;

                    if (node.depth > 0) {
                        marker = isLast ? "└─ " : "├─ ";
                        childPrefix += isLast ? "&nbsp;&nbsp;&nbsp;" : "│&nbsp;&nbsp;";
                    }

                    // Add to result with calculated prefix
                    // We only want to adding TABLES to the final list, but we must traverse JOBS.
                    if (node.type === "TABLE" || node.depth === 0) {
                        flatList.push({
                            ...node,
                            treePrefix: (node.depth === 0) ? "" : (prefix + marker)
                        });
                    }

                    // Traverse children
                    // If this node is a TABLE, its children are JOBS.
                    // If this node is a JOB, its children are TABLES.
                    // We just traverse node.children.
                    // NOTE: If we want to hide the JOB level indentation, we shouldn't add to prefix when traversing JOB?
                    // User wants: Table -> Table (with line).
                    // Logic: Table A -> Job 1 -> Table B.
                    // If we skip Job 1 visually, Table B should look like child of Table A.
                    // So when recursing from Table -> Job, DO NOT change prefix?
                    // When recursing from Job -> Table, ADD prefix?
                    // Let's try: One visual hop per Table-to-Table.

                    if (node.type === "TABLE" || node.depth === 0) {
                        // Entering Job Layer: don't indent yet, just pass through?
                        // Actually, the line must connect Table A to Table B.
                        // Table A
                        // ├─ Table B (via Job 1)
                        // └─ Table C (via Job 2)
                        // The branch splits at Table A.
                        // So Table A's children (Jobs) effectively represent the branches.
                        traverse(node.children, childPrefix, isLast);
                    } else {
                        // Entering Table Layer (from Job):
                        // We are inside a Job (branch).
                        // Usually a Job has 1 output table (or multiple).
                        // If Job has multiple tables, they share the same "Via Job" context.
                        // Visually, strictly speaking, Table B is child of Job.
                        // If we hide Job, Table B is child of Table A.
                        traverse(node.children, prefix, isLast); // Pass prefix through? 
                    }
                });
            };

            // RE-THINKING PREFIX LOGIC FOR "Table-to-Table" Visualization
            // Data: Root (Table) -> [Job1, Job2]
            // Job1 -> [Table A]
            // Job2 -> [Table B]
            // Visual:
            // Root
            // ├─ Table A
            // └─ Table B

            // The branching happens at Root. Root has 2 "logical" children (Table A, Table B).
            // So we should iterate Root's *Jobs*, and for each Job, iterate its *Tables*.
            // The "Last Child" logic applies to the *Jobs* (because they distinct branches).

            const traverseLogical = (nodes, prefix) => {
                nodes.forEach((node, index) => {
                    // node is typically a JOB (child of a Table)
                    // Or it could be a TABLE if direct link? (unlikely in this model)

                    const isLast = index === nodes.length - 1;
                    const marker = isLast ? "└─ " : "├─ ";
                    const nextPrefix = prefix + (isLast ? "&nbsp;&nbsp;&nbsp;" : "│&nbsp;&nbsp;");

                    // For each Job, get its children (Tables)
                    if (node.children && node.children.length > 0) {
                        node.children.forEach(childTable => {
                            // This childTable is the "Logical Child" of the previous Table
                            // We render THIS table.
                            flatList.push({
                                ...childTable,
                                treePrefix: prefix + marker
                            });

                            // Recurse: This table might have its own Jobs...
                            if (childTable.children && childTable.children.length > 0) {
                                traverseLogical(childTable.children, nextPrefix);
                            }
                        });
                    }
                });
            };

            // Start Traversal
            // Roots are Tables.
            if (roots.length > 0) {
                // Add Root First
                flatList.push({ ...roots[0], treePrefix: "" });
                // Traverse its children (Jobs)
                traverseLogical(roots[0].children, "");
            }

            // FILTER: Tables only (or Root) - Actually flatList is already built exactly how we want.
            const tableItems = flatList;

            // Unified Title: Table X. Title
            const titleDiv = document.createElement("div");
            titleDiv.className = "apa-table-label"; // Re-using label class which is bold
            titleDiv.textContent = `${directionLabel}`;
            body.appendChild(titleDiv);

            const table = document.createElement("table");
            table.className = "apa-table";

            // Columns: Table Name | Via Job | Depth | Owner | Info
            const thead = document.createElement("thead");
            thead.innerHTML = `
                <tr>
                    <th>Table Name</th>
                    <th>Via Job</th>
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
                    if (parentNode && parentNode.type === "JOB") {
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
                let nameHtml = `<span class="node-label-text">${item.name}</span>`;

                if (item.depth === 0) {
                    nameHtml = `<span class="root-table-badge">${item.name}</span>`;
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

        // Helper to count unique jobs
        const getCounts = (items) => {
            if (!items) return { t: 0, j: 0 };

            // Count Tables (Type TABLE or Depth 0)
            const tableCount = items.filter(i => i.type === "TABLE" || i.depth === 0).length;

            // Count Unique Jobs (Type JOB)
            // Filter by type "JOB" explicitly to avoid counting tables as parents
            const uniqueJobs = new Set(
                items.filter(i => i.type === "JOB").map(i => i.name)
            );

            return { t: tableCount, j: uniqueJobs.size };
        };

        if (data.upstream && data.upstream.length > 0) {
            const c = getCounts(data.upstream);
            container.appendChild(createApaTable(`Upstream (${c.t} tables / ${c.j} jobs)`, data.upstream, 1));
        }

        if (data.downstream && data.downstream.length > 0) {
            const c = getCounts(data.downstream);
            container.appendChild(createApaTable(`Downstream (${c.t} tables / ${c.j} jobs)`, data.downstream, 2));
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

        const data = this.lastFullLineageData;
        const rootNode = selectionState.selectedNode;
        const rootName = rootNode ? (rootNode.label || rootNode.id) : "Unknown";
        const dateStr = new Date().toISOString().split('T')[0];

        // Define Styles for Excel (HTML approach)
        const styles = `
            <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; }
                th { border: 1px solid #000; background-color: #f0f0f0; font-weight: bold; padding: 5px; text-align: left; }
                td { border: 1px solid #000; padding: 5px; vertical-align: top; }
                .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                .root-row { background-color: #d9d9d9; font-weight: bold; }
                .note { font-style: italic; color: #555; margin-top: 10px; }
            </style>
        `;

        // Helper to build table HTML
        const buildTableHtml = (title, items) => {
            if (!items || items.length === 0) return "";

            // Filter
            const tableItems = items.filter(i => i.type === "TABLE" || i.depth === 0);

            let html = `<tr><td colspan="5" class="title" style="border:none; font-weight:bold; font-size:14px;">${title}</td></tr>`;
            html += `
                <tr>
                    <th>Table Name</th>
                    <th>Via Job</th>
                    <th>Depth</th>
                    <th>Owner</th>
                    <th>Info</th>
                </tr>
            `;

            tableItems.forEach(item => {
                const logicalDepth = Math.floor(item.depth / 2);
                let indent = "";
                for (let i = 0; i < logicalDepth; i++) indent += " &nbsp; "; // Approx indentation
                if (logicalDepth > 0) indent += "└ ";

                let jobName = "-";
                let jobStatus = "-";

                if (item.parent) {
                    const parentNode = items.find(p => p.id === item.parent || p.name === item.parent);
                    if (parentNode && parentNode.type === "JOB") {
                        jobName = parentNode.name;
                        const jProps = parentNode.properties || {};
                        jobStatus = jProps.status || jProps.run_status || "unknown";
                    }
                }

                const tProps = item.properties || {};
                const owner = tProps.owner || "-";
                const info = tProps.description || tProps.table_type || "-";

                // Style for Root
                const rowStyle = (item.depth === 0) ? 'style="background-color:#d9d9d9; font-weight:bold;"' : '';

                html += `
                    <tr ${rowStyle}>
                        <td>${indent}${item.name}</td>
                        <td>${jobName} (${jobStatus})</td>
                        <td>${logicalDepth}</td>
                        <td>${owner}</td>
                        <td>${info}</td>
                    </tr>
                `;
            });

            html += `<tr><td colspan="5" style="border:none;"></td></tr>`; // Spacer
            return html;
        };

        let bodyContent = "<table>";

        // Upstream
        if (data.upstream && data.upstream.length > 0) {
            bodyContent += buildTableHtml(`Table 1. Upstream Lineage for ${rootName}`, data.upstream);
        }

        // Downstream
        if (data.downstream && data.downstream.length > 0) {
            bodyContent += buildTableHtml(`Table 2. Downstream Lineage for ${rootName}`, data.downstream);
        }

        bodyContent += `
            <tr>
                <td colspan="5" style="border:none; font-style:italic;">
                    Note. Lineage Information from analysis. Created at ${dateStr}.
                </td>
            </tr>
        `;
        bodyContent += "</table>";

        const fullHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                <x:Name>Lineage Report</x:Name>
                <x:WorksheetOptions>
                <x:DisplayGridlines/>
                </x:WorksheetOptions>
                </x:ExcelWorksheet>
                </x:ExcelWorksheets>
                </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                ${styles}
            </head>
            <body>
                ${bodyContent}
            </body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `lineage_export_${rootName}_${Date.now()}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export default ListView;

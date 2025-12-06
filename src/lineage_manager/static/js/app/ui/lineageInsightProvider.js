/**
 * LineageInsightProvider - Compute and render lineage insights for tables
 * Extracted from PanelController (~280 lines)
 * Responsibilities: compute path/root/leaf, render drawer UI, handle lineage analysis
 */

export class LineageInsightProvider {
    constructor() {
        this.lineageState = this.createEmptyState();
        this.lineageUI = {
            pathPreview: document.getElementById("lineage-path-preview"),
            pathButton: document.getElementById("lineage-path-expand"),
            rootSummary: document.getElementById("lineage-root-summary"),
            rootButton: document.getElementById("lineage-root-expand"),
            leafSummary: document.getElementById("lineage-leaf-summary"),
            leafButton: document.getElementById("lineage-leaf-expand"),
            upstreamSummary: document.getElementById("lineage-upstream-summary"),
            downstreamSummary: document.getElementById("lineage-downstream-summary"),
            depthSummary: document.getElementById("lineage-depth-summary"),
            drawer: document.getElementById("lineage-drawer"),
            drawerTitle: document.getElementById("lineage-drawer-title"),
            drawerSubtitle: document.getElementById("lineage-drawer-subtitle"),
            drawerBody: document.getElementById("lineage-drawer-body"),
            drawerClose: document.getElementById("lineage-drawer-close"),
        };

        this.bindDrawerEvents();
    }

    /**
     * Compute and update lineage insights for a table node
     */
    updateInsights(node) {
        if (!this.isTableNode(node)) {
            this.setState(this.createEmptyState());
            return;
        }

        const insights = this.computeInsights(node);
        this.setState(insights);
    }

    /**
     * Compute all lineage insights
     */
    computeInsights(node) {
        if (!this.isTableNode(node)) {
            return this.createEmptyState();
        }

        const upstreamTables = this.collectDirectionalNodes(node, "upstream", (n) =>
            this.isTableNode(n) && n.id() !== node.id()
        );
        const downstreamTables = this.collectDirectionalNodes(node, "downstream", (n) =>
            this.isTableNode(n)
        );
        const upstreamJobs = this.collectDirectionalNodes(node, "upstream", (n) =>
            this.isJobNode(n)
        );
        const downstreamJobs = this.collectDirectionalNodes(node, "downstream", (n) =>
            this.isJobNode(n)
        );

        const rootCandidates = upstreamTables.filter(
            (tbl) => tbl.predecessors("node[type='table']").length === 0
        );
        const leafCandidates = downstreamTables.filter(
            (tbl) => tbl.successors("node[type='table']").length === 0
        );

        const upstreamDepth = this.computeDepth(node, "upstream");
        const downstreamDepth = this.computeDepth(node, "downstream");
        const pathNodes = this.buildPathToRoot(node, rootCandidates);

        return {
            pathNodes,
            pathPreview: this.formatPathPreview(pathNodes),
            rootTables: rootCandidates.map((tbl) => this.formatNodeInfo(tbl)),
            leafTables: leafCandidates.map((tbl) => this.formatNodeInfo(tbl)),
            upstream: { tables: upstreamTables.length, jobs: upstreamJobs.length },
            downstream: { tables: downstreamTables.length, jobs: downstreamJobs.length },
            depth: { upstream: upstreamDepth, downstream: downstreamDepth },
        };
    }

    /**
     * Collect nodes in a direction with optional predicate
     */
    collectDirectionalNodes(startNode, direction, predicate) {
        if (!startNode) return [];

        const queue = [startNode];
        const visited = new Set([startNode.id()]);
        const matches = new Map();

        while (queue.length) {
            const current = queue.shift();
            const neighbors =
                direction === "upstream" ? current.incomers("node") : current.outgoers("node");

            neighbors.forEach((next) => {
                if (!next || typeof next.id !== "function") return;

                const id = next.id();
                if (visited.has(id)) return;

                visited.add(id);
                queue.push(next);

                if (typeof predicate === "function" && predicate(next)) {
                    matches.set(id, next);
                }
            });
        }

        return Array.from(matches.values());
    }

    /**
     * Compute max depth to root/leaf (table-only hops)
     */
    computeDepth(startNode, direction) {
        if (!startNode) return 0;

        const visited = new Set([startNode.id()]);
        const queue = [{ node: startNode, depth: 0 }];
        let maxDepth = 0;

        while (queue.length) {
            const { node, depth } = queue.shift();
            const neighbors =
                direction === "upstream" ? node.incomers("node") : node.outgoers("node");

            neighbors.forEach((next) => {
                if (!next || typeof next.id !== "function") return;

                const id = next.id();
                if (visited.has(id)) return;

                const isTable = this.isTableNode(next);
                const nextDepth = isTable ? depth + 1 : depth;

                visited.add(id);
                queue.push({ node: next, depth: nextDepth });

                if (isTable) {
                    maxDepth = Math.max(maxDepth, nextDepth);
                }
            });
        }

        return maxDepth;
    }

    /**
     * Build shortest path to root
     */
    buildPathToRoot(targetNode, roots) {
        if (!targetNode) return [];

        const cy = targetNode.cy?.();
        if (!cy) return [this.formatNodeInfo(targetNode)];

        let bestPath = null;
        (roots || []).forEach((root) => {
            if (!root) return;

            const result = cy.elements().aStar({ root, goal: targetNode, directed: true });
            if (result.found) {
                const nodes = result.path.filter("node").toArray();
                if (!bestPath || nodes.length < bestPath.length) {
                    bestPath = nodes;
                }
            }
        });

        const fallback = bestPath && bestPath.length ? bestPath : [targetNode];
        return fallback.map((node) => this.formatNodeInfo(node));
    }

    /**
     * Format node info for UI
     */
    formatNodeInfo(node) {
        if (!node) return { id: "", type: "", display: "", secondary: "" };

        const type = (node.data("type") || "").toLowerCase();
        const fullName = node.data("full_name") || node.data("label") || node.id();
        const display = type === "table" ? fullName : node.data("label") || node.id();

        let secondary = "";
        if (type === "table") {
            const short = node.data("label");
            if (short && short !== display) secondary = short;
        } else {
            secondary = node.data("sub_label") || node.data("job_id") || "";
        }

        return { id: node.id(), type, display, secondary };
    }

    /**
     * Format path preview
     */
    formatPathPreview(nodes) {
        if (!nodes || !nodes.length) return "No lineage path available.";

        const labels = nodes.map((node) => node.display || node.id);
        if (labels.length <= 5) {
            return labels.join(" → ");
        }

        const first = labels[0];
        const second = labels[1];
        const penultimate = labels[labels.length - 2];
        const last = labels[labels.length - 1];
        return `${first} → ${second} → … → ${penultimate} → ${last}`;
    }

    /**
     * Set internal state and update UI
     */
    setState(state) {
        this.lineageState = state;
        this.updateUI();
    }

    /**
     * Update all lineage UI elements
     */
    updateUI() {
        const data = this.lineageState || this.createEmptyState();

        if (this.lineageUI.pathPreview) {
            this.lineageUI.pathPreview.textContent = data.pathPreview;
        }
        if (this.lineageUI.pathButton) {
            this.lineageUI.pathButton.disabled = data.pathNodes.length <= 1;
        }

        if (this.lineageUI.rootSummary) {
            this.lineageUI.rootSummary.textContent = String(data.rootTables.length);
        }
        if (this.lineageUI.rootButton) {
            this.lineageUI.rootButton.disabled = !data.rootTables.length;
        }

        if (this.lineageUI.leafSummary) {
            this.lineageUI.leafSummary.textContent = String(data.leafTables.length);
        }
        if (this.lineageUI.leafButton) {
            this.lineageUI.leafButton.disabled = !data.leafTables.length;
        }

        if (this.lineageUI.upstreamSummary) {
            this.lineageUI.upstreamSummary.innerHTML = `Tables: ${data.upstream.tables}<br>Jobs: ${data.upstream.jobs}`;
        }
        if (this.lineageUI.downstreamSummary) {
            this.lineageUI.downstreamSummary.innerHTML = `Tables: ${data.downstream.tables}<br>Jobs: ${data.downstream.jobs}`;
        }
        if (this.lineageUI.depthSummary) {
            this.lineageUI.depthSummary.innerHTML = `Upstream: ${data.depth.upstream}<br>Downstream: ${data.depth.downstream}`;
        }
    }

    /**
     * Open drawer for path/root/leaf
     */
    openDrawer(mode) {
        if (!this.lineageState) return;

        if (mode === "path") {
            if (!this.lineageState.pathNodes || this.lineageState.pathNodes.length <= 1) return;
            this.showPathDrawer();
            return;
        }

        if (mode === "root") {
            if (!this.lineageState.rootTables.length) return;
            this.showListDrawer(
                this.lineageState.rootTables,
                "Root tables",
                "No root tables found."
            );
            return;
        }

        if (mode === "leaf") {
            if (!this.lineageState.leafTables.length) return;
            this.showListDrawer(
                this.lineageState.leafTables,
                "Leaf tables",
                "No leaf tables found."
            );
        }
    }

    /**
     * Show path drawer
     */
    showPathDrawer() {
        const section = document.createElement("div");
        section.className = "drawer-section";

        const list = document.createElement("ol");
        list.className = "drawer-path";

        this.lineageState.pathNodes.forEach((node, index) => {
            const item = document.createElement("li");

            const chip = document.createElement("span");
            chip.className = `drawer-chip ${node.type}`;
            chip.textContent = node.type === "job" ? "JOB" : "TABLE";

            const line = document.createElement("div");
            line.className = "drawer-line";

            const primary = document.createElement("div");
            primary.className = "drawer-primary";
            primary.textContent = node.display;
            line.appendChild(primary);

            if (node.secondary) {
                const secondary = document.createElement("div");
                secondary.className = "drawer-secondary";
                secondary.textContent = node.secondary;
                line.appendChild(secondary);
            }

            item.setAttribute("data-index", String(index));
            item.append(chip, line);
            list.appendChild(item);
        });

        section.appendChild(list);
        this.showDrawer({
            title: "Full lineage path",
            subtitle: `${this.lineageState.pathNodes.length} nodes`,
            content: section,
        });
    }

    /**
     * Show list drawer for root/leaf tables
     */
    showListDrawer(items, title, emptyText) {
        const section = document.createElement("div");
        section.className = "drawer-section";

        const search = document.createElement("input");
        search.type = "search";
        search.className = "drawer-search";
        search.placeholder = "Filter by name…";

        const list = document.createElement("ul");
        list.className = "drawer-list";

        const render = (query = "") => {
            const normalized = query.trim().toLowerCase();
            const filtered = normalized
                ? items.filter((item) => {
                    const haystack = `${item.display} ${item.secondary || ""}`.toLowerCase();
                    return haystack.includes(normalized);
                })
                : items;

            if (!filtered.length) {
                list.innerHTML = `<li class="empty">${emptyText}</li>`;
                return;
            }

            list.innerHTML = "";
            filtered.forEach((item) => {
                const row = document.createElement("li");

                const chip = document.createElement("span");
                chip.className = `drawer-chip ${item.type}`;
                chip.textContent = item.type === "job" ? "JOB" : "TABLE";

                const line = document.createElement("div");
                line.className = "drawer-line";

                const primary = document.createElement("div");
                primary.className = "drawer-primary";
                primary.textContent = item.display;
                line.appendChild(primary);

                if (item.secondary) {
                    const secondary = document.createElement("div");
                    secondary.className = "drawer-secondary";
                    secondary.textContent = item.secondary;
                    line.appendChild(secondary);
                }

                row.append(chip, line);
                list.appendChild(row);
            });
        };

        search.addEventListener("input", () => render(search.value));
        render();

        section.append(search, list);
        this.showDrawer({ title, subtitle: `${items.length} items`, content: section });
    }

    /**
     * Show drawer
     */
    showDrawer({ title, subtitle, content }) {
        const drawer = this.lineageUI.drawer;
        if (!drawer) return;

        if (this.lineageUI.drawerTitle) {
            this.lineageUI.drawerTitle.textContent = title || "";
        }
        if (this.lineageUI.drawerSubtitle) {
            this.lineageUI.drawerSubtitle.textContent = subtitle || "";
        }

        if (this.lineageUI.drawerBody) {
            this.lineageUI.drawerBody.innerHTML = "";
            if (content instanceof HTMLElement) {
                this.lineageUI.drawerBody.appendChild(content);
            } else if (typeof content === "string") {
                this.lineageUI.drawerBody.innerHTML = content;
            }
        }

        drawer.hidden = false;
        requestAnimationFrame(() => drawer.classList.add("open"));
    }

    /**
     * Close drawer
     */
    closeDrawer() {
        if (!this.lineageUI.drawer) return;
        this.lineageUI.drawer.classList.remove("open");
        this.lineageUI.drawer.hidden = true;
    }

    /**
     * Bind drawer events
     */
    bindDrawerEvents() {
        const { pathButton, rootButton, leafButton, drawerClose, drawer } = this.lineageUI;

        pathButton?.addEventListener("click", () => this.openDrawer("path"));
        rootButton?.addEventListener("click", () => this.openDrawer("root"));
        leafButton?.addEventListener("click", () => this.openDrawer("leaf"));
        drawerClose?.addEventListener("click", () => this.closeDrawer());

        drawer?.addEventListener("click", (event) => {
            if (event.target === drawer) this.closeDrawer();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") this.closeDrawer();
        });
    }

    /**
     * Create empty state
     */
    createEmptyState() {
        return {
            pathNodes: [],
            pathPreview: "Select a table to analyze lineage.",
            rootTables: [],
            leafTables: [],
            upstream: { tables: 0, jobs: 0 },
            downstream: { tables: 0, jobs: 0 },
            depth: { upstream: 0, downstream: 0 },
        };
    }

    isTableNode(node) {
        if (!node) return false;
        return String(node.data("type") || "").toLowerCase() === "table";
    }

    isJobNode(node) {
        if (!node) return false;
        return String(node.data("type") || "").toLowerCase() === "job";
    }
}

export default LineageInsightProvider;

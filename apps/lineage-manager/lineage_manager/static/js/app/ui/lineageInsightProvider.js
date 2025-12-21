/**
 * LineageInsightProvider - Compute and render lineage insights for tables
 * Extracted from PanelController (~280 lines)
 * Responsibilities: compute path/root/leaf, render drawer UI, handle lineage analysis
 */

const PATH_COLLAPSE_THRESHOLD = 3;
const PATH_FLOW_STYLE =
    (typeof window !== "undefined" && window.LINEAGE_FLOW_STYLE) || "particle"; // "particle" | "dash"

export class LineageInsightProvider {
    constructor() {
        this.lineageState = this.createEmptyState();
        this.lineageUI = {};
        this.pathCollapseState = new Map();
        this.connectorCounter = 0;
        this.init();
    }

    /**
     * Bind UI elements from the DOM. 
     * Necessary if HTML is injected after Provider creation.
     */
    init() {
        this.lineageUI = {
            rootSummary: document.getElementById("lineage-root-summary"),
            rootButton: document.getElementById("lineage-root-expand"),
            leafSummary: document.getElementById("lineage-leaf-summary"),
            leafButton: document.getElementById("lineage-leaf-expand"),
            impactTables: document.getElementById("lineage-impact-tables"),
            impactJobs: document.getElementById("lineage-impact-jobs"),
            depthSummary: document.getElementById("lineage-depth-summary"),
            drawer: document.getElementById("lineage-drawer"),
            drawerTitle: document.getElementById("lineage-drawer-title"),
            drawerSubtitle: document.getElementById("lineage-drawer-subtitle"),
            drawerBody: document.getElementById("lineage-drawer-body"),
            drawerClose: document.getElementById("lineage-drawer-close"),
        };

        this.bindDrawerEvents();
    }

    setIdle(message = 'Select "Lineage" tab to load lineage summary.') {
        const state = this.createEmptyState();
        this.pathCollapseState.clear();
        this.setState(state);
    }

    setLoading(message = "Loading lineage summary…") {
        const state = this.createEmptyState();
        this.setState(state);
    }

    setError(message = "Failed to load lineage summary.") {
        // No path preview to set error on anymore, maybe use root/leaf summary as fallback or toast?
        this.setState(this.createEmptyState());
    }

    setSummary(summary) {
        if (!summary || summary.status !== "success") {
            this.setError("Lineage summary unavailable.");
            return;
        }

        const metrics = summary.metrics || {};
        const upstream = summary.upstream || {};
        const downstream = summary.downstream || {};
        const paths = summary.paths || {};

        const previewCollections = this.buildPathCollections(paths.preview);
        const fullCollections = this.buildPathCollections(paths.full);
        const pathCollections = fullCollections.length ? fullCollections : previewCollections;
        const selectedPath =
            previewCollections.length ? previewCollections[0] : pathCollections[0] || [];

        const state = {
            pathNodes: selectedPath,
            pathCollections,
            pathPreview: this.formatPathPreview(selectedPath),
            rootTables: this.buildEntries(upstream.root_tables || []),
            leafTables: this.buildEntries(downstream.leaf_tables || []),
            rootCount: metrics.root_count ?? (upstream.root_tables?.length || 0),
            leafCount: metrics.leaf_count ?? (downstream.leaf_tables?.length || 0),
            upstream: {
                tables: metrics.upstream_table_count ?? (upstream.tables?.length || 0),
                jobs: metrics.upstream_job_count ?? (upstream.jobs?.length || 0),
            },
            downstream: {
                tables: metrics.downstream_table_count ?? (downstream.tables?.length || 0),
                jobs: metrics.downstream_job_count ?? (downstream.jobs?.length || 0),
            },
            depth: {
                upstream: metrics.depth?.upstream ?? 0,
                downstream: metrics.depth?.downstream ?? 0,
            },
        };

        this.setState(state);
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

        const labels = nodes.map((node) => node.display || node.id || String(node));
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
            const value = typeof data.rootCount === "number" ? data.rootCount : data.rootTables.length;
            this.lineageUI.rootSummary.textContent = String(value);
        }
        if (this.lineageUI.rootButton) {
            this.lineageUI.rootButton.disabled = !data.rootTables.length;
        }

        if (this.lineageUI.leafSummary) {
            const value = typeof data.leafCount === "number" ? data.leafCount : data.leafTables.length;
            this.lineageUI.leafSummary.textContent = String(value);
        }
        if (this.lineageUI.leafButton) {
            this.lineageUI.leafButton.disabled = !data.leafTables.length;
        }

        if (this.lineageUI.impactTables) {
            this.lineageUI.impactTables.textContent = String(data.downstream.tables);
        }
        if (this.lineageUI.impactJobs) {
            this.lineageUI.impactJobs.textContent = String(data.downstream.jobs);
        }
        if (this.lineageUI.depthSummary) {
            this.lineageUI.depthSummary.innerHTML = `Upstream: &nbsp;${data.depth.upstream}<br>Downstream: ${data.depth.downstream}`;
        }
    }

    /**
     * Open drawer for path/root/leaf
     */
    openDrawer(mode) {
        if (!this.lineageState) return;

        if (mode === "path") {
            const hasPaths =
                (this.lineageState.pathCollections && this.lineageState.pathCollections.length) ||
                (this.lineageState.pathNodes && this.lineageState.pathNodes.length > 1);
            if (!hasPaths) return;
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
        const paths =
            (this.lineageState.pathCollections && this.lineageState.pathCollections.length
                ? this.lineageState.pathCollections
                : [this.lineageState.pathNodes]) || [];

        if (!paths.length || !paths[0].length) return;

        const loading = document.createElement("div");
        loading.className = "drawer-loading";
        loading.innerHTML = `<span class="spinner"></span>Rendering lineage paths…`;

        this.showDrawer({
            title: "Lineage paths",
            subtitle: `${paths.length} path${paths.length > 1 ? "s" : ""}`,
            content: loading,
        });

        requestAnimationFrame(() => {
            this.connectorCounter = 0;
            const wrapper = document.createElement("div");
            wrapper.className = "drawer-section path-graph-wrapper";

            paths.forEach((path, idx) => {
                if (!Array.isArray(path) || !path.length) return;
                const block = this.renderPathBlock(path, idx);
                wrapper.appendChild(block);
            });

            if (this.lineageUI.drawerBody) {
                this.lineageUI.drawerBody.innerHTML = "";
                this.lineageUI.drawerBody.appendChild(wrapper);
            }
        });
    }

    renderPathBlock(path, idx) {
        const key = `path-${idx}`;
        const totalNodes = path.length;
        const collapsed = this.getCollapseState(key, totalNodes);

        const block = document.createElement("div");
        block.className = "path-graph-block";

        const title = document.createElement("div");
        title.className = "drawer-section-title";
        title.textContent = `Path ${idx + 1} (${totalNodes} node${totalNodes > 1 ? "s" : ""})`;

        const { svg, hiddenCount } = this.renderPathGraph(path, { collapsed });

        block.append(title, svg);

        if (collapsed && hiddenCount > 0) {
            const more = document.createElement("div");
            more.className = "path-more";
            more.textContent = `(${hiddenCount} more…)`;
            block.appendChild(more);
        }

        if (totalNodes > PATH_COLLAPSE_THRESHOLD) {
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "path-toggle";
            toggle.textContent = collapsed ? "Show full path ▸" : "Hide path ◂";
            toggle.addEventListener("click", () => {
                this.pathCollapseState.set(key, !collapsed);
                const updated = this.renderPathBlock(path, idx);
                block.replaceWith(updated);
            });
            block.appendChild(toggle);
        }

        return block;
    }

    getCollapseState(key, totalNodes) {
        if (this.pathCollapseState.has(key)) {
            return this.pathCollapseState.get(key);
        }
        const defaultCollapsed = totalNodes > PATH_COLLAPSE_THRESHOLD;
        this.pathCollapseState.set(key, defaultCollapsed);
        return defaultCollapsed;
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
            pathCollections: [],
            pathPreview: "Select a table to analyze lineage.",
            rootTables: [],
            leafTables: [],
            rootCount: 0,
            leafCount: 0,
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

    buildEntries(names, type = "table") {
        if (!Array.isArray(names)) return [];
        return names
            .filter(Boolean)
            .map((name) => ({
                id: name,
                type,
                display: name,
                secondary: this.extractShortName(name),
            }));
    }

    extractShortName(value) {
        if (typeof value !== "string") return "";
        const parts = value.split(".");
        const last = parts[parts.length - 1];
        return last && last !== value ? last : "";
    }

    buildPathCollections(input) {
        if (!Array.isArray(input)) return [];
        return input
            .filter((path) => Array.isArray(path) && path.length)
            .map((path) =>
                path.map((name) => ({
                    id: name,
                    type: "table",
                    display: name,
                    secondary: this.extractShortName(name),
                }))
            );
    }

    buildPathList(pathNodes) {
        const list = document.createElement("ol");
        list.className = "drawer-path";

        pathNodes.forEach((node, index) => {
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

        return list;
    }

    renderPathGraph(pathNodes, options = {}) {
        const nodes = Array.isArray(pathNodes) ? pathNodes : [];
        const collapsed =
            options.collapsed ?? (nodes.length > PATH_COLLAPSE_THRESHOLD);
        const renderNodes =
            collapsed && nodes.length > PATH_COLLAPSE_THRESHOLD
                ? nodes.slice(0, PATH_COLLAPSE_THRESHOLD)
                : nodes;
        const hiddenCount = Math.max(nodes.length - renderNodes.length, 0);

        const nodeSpacing = 28;
        const marginTop = 20;
        const circleRadius = 6;
        const indentStep = 32;
        const baseX = 24;
        const labelGap = 12;
        const nodesToRender = renderNodes;
        const maxIndent = (nodesToRender.length - 1) * indentStep;
        const width = Math.max(420, baseX + maxIndent + 220);
        const height = nodesToRender.length
            ? marginTop * 2 + (nodesToRender.length - 1) * nodeSpacing
            : 60;
        const strokeColor = "#94a3b8";
        const useParticleFlow = PATH_FLOW_STYLE === "particle";

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", width);
        svg.setAttribute("height", Math.max(height, 60));
        svg.classList.add("path-graph-svg");

        if (!nodesToRender.length) {
            return { svg, hiddenCount: 0 };
        }

        const markerId = `path-arrow-${Math.random().toString(36).slice(2)}`;
        const defs = document.createElementNS(svgNS, "defs");
        const marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", markerId);
        marker.setAttribute("orient", "auto");
        marker.setAttribute("markerWidth", "6");
        marker.setAttribute("markerHeight", "6");
        // marker.setAttribute("refX", "5.5");
        marker.setAttribute("refX", "4.5");
        marker.setAttribute("refY", "3");
        marker.setAttribute("viewBox", "0 0 6 6");

        const arrowPath = document.createElementNS(svgNS, "path");
        arrowPath.setAttribute("d", "M0,0 L6,3 L0,6 z");
        arrowPath.setAttribute("fill", strokeColor);
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svg.appendChild(defs);

        const xlinkNS = "http://www.w3.org/1999/xlink";

        for (let i = 0; i < nodesToRender.length - 1; i++) {
            const parentY = marginTop + i * nodeSpacing;
            const childY = marginTop + (i + 1) * nodeSpacing;
            const parentX = baseX + i * indentStep;
            const childX = baseX + (i + 1) * indentStep;
            const verticalStart = parentY;
            const verticalEnd = childY;
            const elbowX = parentX;
            const horizontalEnd = childX - circleRadius - 2;
            const connectorId = useParticleFlow ? `lineage-flow-${this.connectorCounter++}` : null;

            const connector = document.createElementNS(svgNS, "path");
            connector.setAttribute(
                "d",
                `M ${elbowX} ${verticalStart} V ${verticalEnd} H ${horizontalEnd}`
            );
            connector.setAttribute("stroke", strokeColor);
            connector.setAttribute("stroke-width", "2");
            connector.setAttribute("fill", "none");
            connector.setAttribute("marker-end", `url(#${markerId})`);
            connector.classList.add("path-connector");
            if (useParticleFlow && connectorId) {
                connector.setAttribute("id", connectorId);
            } else {
                connector.classList.add("path-connector-flow");
            }
            svg.appendChild(connector);

            if (useParticleFlow && connectorId) {
                const particle = document.createElementNS(svgNS, "circle");
                particle.setAttribute("r", "2.5");
                particle.setAttribute("fill", strokeColor);

                const motion = document.createElementNS(svgNS, "animateMotion");
                motion.setAttribute("dur", "1.6s");
                motion.setAttribute("repeatCount", "indefinite");

                const mpath = document.createElementNS(svgNS, "mpath");
                mpath.setAttribute("href", `#${connectorId}`);
                mpath.setAttributeNS(xlinkNS, "xlink:href", `#${connectorId}`);

                motion.appendChild(mpath);
                particle.appendChild(motion);
                svg.appendChild(particle);
            }
        }

        nodesToRender.forEach((node, index) => {
            const cy = marginTop + index * nodeSpacing;
            const cx = baseX + index * indentStep;
            const color = this.getNodeColor(node);

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", String(circleRadius));
            circle.setAttribute("fill", color);
            svg.appendChild(circle);

            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("x", cx + labelGap);
            label.setAttribute("y", cy + 4);
            label.setAttribute("font-size", "13");
            label.setAttribute("fill", "#111827");
            label.textContent = node.display || node.id || "";
            svg.appendChild(label);
        });

        return { svg, hiddenCount };
    }

    getNodeColor(node) {
        const type = (node?.type || "").toLowerCase();
        if (type === "job") return "#FB8C00";
        if (type === "storage") return "#6366F1";
        return "#1A73E8";
    }
}

export default LineageInsightProvider;

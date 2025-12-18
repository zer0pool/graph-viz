/**
 * GraphPositioning - Node positioning algorithms
 * Handles layout, positioning, and coordinate calculations
 */

const BASE_VERTICAL_SPACING = 70;
const BASE_HORIZONTAL_SPACING = 220;
const DAGRE_NODE_SEP_HORIZONTAL = 80;
const DAGRE_NODE_SEP_VERTICAL = 60;
const DAGRE_RANK_SEP_HORIZONTAL = 100;
const DAGRE_RANK_SEP_VERTICAL = 60;
const DAGRE_EDGE_SEP = 16;

export class GraphPositioning {
    constructor(graphView, persistence) {
        this.view = graphView;
        this.persistence = persistence;
    }

    /**
     * Find center node by label or ID
     */
    findCenterNode(centerLabel = null) {
        const cy = this.view.getCy();
        if (!cy) return null;

        // Search by label
        if (centerLabel) {
            const match = cy.nodes().filter((node) => {
                const lbl = node.data("label");
                const full = node.data("full_name");
                return lbl === centerLabel || full === centerLabel;
            });
            if (match && match.nonempty()) return match[0];
        }

        // Use last known center
        const centerId = this.persistence.getCurrentCenterId();
        if (centerId) {
            const existing = cy.$(`#${centerId}`);
            if (existing && existing.nonempty()) return existing;
        }

        // Default: first table or first node
        const tables = cy.nodes("[type='table']");
        if (tables.nonempty()) return tables[0];

        const all = cy.nodes();
        return all.nonempty() ? all[0] : null;
    }

    /**
     * Position nodes by levels from center
     */
    positionByLevels(levels, centerPos) {
        if (!levels || !levels.size) return;

        const cy = this.view.getCy();
        if (!cy) return;

        const groups = new Map();

        levels.forEach((lvl, nodeId) => {
            if (lvl === 0) return;
            if (!groups.has(lvl)) groups.set(lvl, []);
            groups.get(lvl).push(nodeId);
        });

        groups.forEach((ids, lvl) => {
            const nodes = ids
                .map((id) => cy.$(`#${id}`))
                .filter((n) => n && n.nonempty());

            if (!nodes.length) return;

            nodes.sort((a, b) => a.id().localeCompare(b.id()));

            const sample = nodes[0];
            const baseHeight = sample.height() || 40;
            const spacingY = Math.max(BASE_VERTICAL_SPACING, baseHeight * 1.1);
            const baseWidth = sample.width() || 160;
            const direction = this.persistence.getLastLayoutDirection();
            const spacingX =
                direction === "vertical"
                    ? Math.max(BASE_VERTICAL_SPACING * 1.1, baseWidth)
                    : Math.max(BASE_HORIZONTAL_SPACING, baseWidth * 1.4);

            nodes.forEach((node, idx) => {
                if (this.persistence.getPosition(node.id())) return;

                const offset = (idx - (nodes.length - 1) / 2) * spacingY;
                node.position({
                    x: centerPos.x + lvl * spacingX,
                    y: centerPos.y + offset,
                });
            });
        });
    }

    /**
     * Compute levels from center node using BFS
     */
    computeLevels(center) {
        const cy = this.view.getCy();
        const levels = new Map();

        if (!cy || !center) return levels;

        levels.set(center.id(), 0);

        const visit = (startNodes, delta, getNext) => {
            const queue = [...startNodes];
            queue.forEach((node) => {
                const base = levels.get(node.id());
                const neighbors = getNext(node);

                neighbors.forEach((n) => {
                    if (levels.has(n.id())) return;
                    levels.set(n.id(), base + delta);
                    queue.push(n);
                });
            });
        };

        visit([center], -1, (node) => node.incomers("node"));
        visit([center], 1, (node) => node.outgoers("node"));

        return levels;
    }

    /**
     * Spread nodes in a line
     */
    spreadNodes(collection, centerPos, dx, spacing = 60) {
        const count = collection.length;
        if (!count) return;

        const sample = collection[0];
        const baseHeight = sample?.height?.() || 40;
        const spacingY = Math.max(spacing, baseHeight * 1.1, BASE_VERTICAL_SPACING);

        collection.forEach((node, idx) => {
            if (this.persistence.getPosition(node.id())) return;

            const offset = (idx - (count - 1) / 2) * spacingY;
            node.position({
                x: centerPos.x + dx,
                y: centerPos.y + offset,
            });
        });
    }

    /**
     * Spread detached nodes in grid
     */
    spreadDetachedNodes(collection, origin, columns = 3, spacingX = BASE_HORIZONTAL_SPACING, spacingY = BASE_VERTICAL_SPACING) {
        if (!collection || !collection.length) return;

        const sample = collection[0];
        const baseHeight = sample?.height?.() || 40;
        const baseWidth = sample?.width?.() || 160;
        const verticalSpacing = Math.max(spacingY, baseHeight * 1.1, BASE_VERTICAL_SPACING);
        const direction = this.persistence.getLastLayoutDirection();
        const horizontalSpacing =
            direction === "vertical"
                ? Math.max(BASE_VERTICAL_SPACING, baseWidth)
                : Math.max(spacingX, baseWidth * 1.2, BASE_HORIZONTAL_SPACING);

        collection.forEach((node, idx) => {
            if (this.persistence.getPosition(node.id())) return;

            const col = idx % columns;
            const row = Math.floor(idx / columns);
            node.position({
                x: origin.x + 300 + col * horizontalSpacing,
                y: origin.y + row * verticalSpacing,
            });
        });
    }

    /**
     * Position new nodes relative to anchor
     */
    positionNewRelative(anchorId, upstreamIds, downstreamIds) {
        const cy = this.view.getCy();
        if (!cy || !anchorId) return;

        const anchor = cy.$(`#${anchorId}`);
        if (!anchor.nonempty()) return;

        const base = anchor.position();
        const anchorWidth = anchor.width() || 160;
        const direction = this.persistence.getLastLayoutDirection();
        const horizontalSpacing =
            direction === "vertical"
                ? Math.max(BASE_VERTICAL_SPACING, anchorWidth)
                : Math.max(BASE_HORIZONTAL_SPACING, anchorWidth * 1.35, 210);

        const place = (ids, dir) => {
            const unique = Array.from(new Set(ids));
            if (!unique.length) return;

            const nodes = unique
                .map((nid) => cy.$(`#${nid}`))
                .filter(
                    (node) =>
                        node &&
                        node.nonempty() &&
                        !this.persistence.getPosition(node.id())
                );

            if (!nodes.length) return;

            const sample = nodes[0];
            const baseHeight = sample.height() || 40;
            const spacingY = Math.max(BASE_VERTICAL_SPACING, baseHeight * 1.1);

            nodes.forEach((node, idx) => {
                const offset = (idx - (nodes.length - 1) / 2) * spacingY;
                node.position({
                    x: base.x + dir * horizontalSpacing,
                    y: base.y + offset,
                });
            });
        };

        place(upstreamIds, -1);
        place(downstreamIds, 1);
    }

    /**
     * Position nodes from center
     */
    positionNodes(centerLabel = null) {
        const cy = this.view.getCy();
        if (!cy) return;

        const center = this.findCenterNode(centerLabel);
        if (!center || !center.nonempty()) return;

        this.persistence.setCurrentCenterId(center.id());

        let centerPos = this.persistence.getPosition(center.id());
        if (!centerPos) {
            centerPos = { x: cy.width() / 2, y: cy.height() / 2 };
        }

        center.position(centerPos);

        const levels = this.computeLevels(center);
        this.positionByLevels(levels, centerPos);

        const unplaced = cy.nodes().filter((node) => !levels.has(node.id()));
        if (unplaced.length) {
            this.spreadDetachedNodes(unplaced, centerPos);
        }

        cy.resize();

        const viewport = this.persistence.getViewport();
        if (!viewport) {
            cy.fit(center, 100);
            this.persistence.cacheViewport();
        }

        this.persistence.cachePositions();
    }

    /**
     * Apply dagre layout algorithm
     */
    forceLayout(direction = "horizontal", preserveViewport = true) {
        const cy = this.view.getCy();
        if (!cy) return;

        this.persistence.clearPositions();

        const previousViewport = preserveViewport
            ? { zoom: cy.zoom(), pan: cy.pan() }
            : null;

        const sample = cy.nodes()[0];
        const sampleHeight = sample?.height?.() || 40;
        const sampleWidth = sample?.width?.() || 160;

        const layout = {
            name: "dagre",
            rankDir: direction === "vertical" ? "TB" : "LR",
            nodeSep:
                direction === "vertical"
                    ? Math.max(DAGRE_NODE_SEP_VERTICAL, sampleWidth * 0.8)
                    : Math.max(DAGRE_NODE_SEP_HORIZONTAL, sampleHeight * 1.4),
            rankSep:
                direction === "vertical"
                    ? Math.max(DAGRE_RANK_SEP_VERTICAL, sampleHeight * 1.5)
                    : Math.max(DAGRE_RANK_SEP_HORIZONTAL, sampleWidth * 0.8),
            edgeSep: DAGRE_EDGE_SEP,
            sort: (a, b) => a.id().localeCompare(b.id()),
            animate: false,
        };

        try {
            cy.layout(layout).run();
        } catch (err) {
            console.warn("Dagre layout failed (missing dependency?), falling back to grid", err);
            // Fallback layout
            cy.layout({
                name: "grid",
                animate: false,
                padding: 50
            }).run();
        }

        if (previousViewport) {
            cy.zoom(previousViewport.zoom);
            cy.pan(previousViewport.pan);
        }

        this.persistence.setLastLayoutDirection(direction);
        this.persistence.cachePositions();
        this.persistence.cacheViewport();
    }
}

export default GraphPositioning;

/**
 * GraphExpansion - Graph expansion and merging
 * Handles expanding neighbors and merging new nodes into existing graph
 */

export class GraphExpansion {
    constructor(graphView, graphNodeSerializer) {
        this.view = graphView;
        this.nodeSerializer = graphNodeSerializer;
    }

    /**
     * Expand graph from a node
     */
    async expand(api, node, direction, depth) {
        const id = node.id();
        const data = node.data();

        const params = {
            direction,
            depth: String(depth),
            node_type: data.type === "table" ? "table" : "job",
        };

        const dbid = parseInt(id.slice(1), 10);
        if (!Number.isNaN(dbid)) params.node_db_id = String(dbid);

        if (data.type === "table") {
            params.table_name = data.full_name || data.label;
        } else {
            params.node_id = data.label || id;
        }

        const payload = await api.expand(params);
        return payload;
    }

    /**
     * Merge expanded graph into existing graph
     */
    mergeGraph(data, anchorId, direction, hiddenNodes = new Set()) {
        const cy = this.view.getCy();
        if (!cy) return;

        const existingNodes = new Set(cy.nodes().map((n) => n.id()));
        const existingEdges = new Set(cy.edges().map((e) => e.id()));
        const edgeKeys = new Set(
            cy.edges().map((e) => `${e.data("source")}__${e.data("target")}__${e.data("io") || ""}`)
        );

        const addedNodeIds = [];
        const upstreamAdded = [];
        const downstreamAdded = [];

        // Add new nodes
        (data.nodes || []).forEach((raw) => {
            if (hiddenNodes.has(raw.id)) return;
            if (!existingNodes.has(raw.id)) {
                const added = cy.add(this.nodeSerializer.serialize(raw));
                added.addClass("just-added");
                setTimeout(() => added.removeClass("just-added"), 600);
                addedNodeIds.push(raw.id);
                existingNodes.add(raw.id);
            }
        });

        // Add new edges
        (data.edges || []).forEach((edge) => {
            if (hiddenNodes.has(edge.source) || hiddenNodes.has(edge.target)) return;

            const key = `${edge.source}__${edge.target}__${edge.io || ""}`;
            if (edgeKeys.has(key)) return;
            if (existingEdges.has(key)) return;

            cy.add({
                data: {
                    id: key,
                    source: edge.source,
                    target: edge.target,
                    io: edge.io || "",
                },
            });
            edgeKeys.add(key);

            if (edge.target === anchorId) upstreamAdded.push(edge.source);
            if (edge.source === anchorId) downstreamAdded.push(edge.target);
        });

        if (direction === "upstream" && upstreamAdded.length === 0) {
            upstreamAdded.push(...addedNodeIds);
        }
        if (direction === "downstream" && downstreamAdded.length === 0) {
            downstreamAdded.push(...addedNodeIds);
        }

        return {
            addedNodeIds,
            upstreamAdded,
            downstreamAdded,
        };
    }
}

export default GraphExpansion;

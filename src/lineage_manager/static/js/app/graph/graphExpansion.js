/**
 * GraphExpansion - Graph expansion and merging
 * Handles expanding neighbors and merging new nodes into existing graph
 * with progressive expansion support
 */

const INITIAL_VISIBLE = 4;  // Show 4 nodes initially
const BATCH_SIZE = 3;        // Expand 3 at a time

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
     * Classify nodes by direction relative to anchor
     */
    classifyNodesByDirection(anchorId, nodes, edges) {
        const upstream = [];
        const downstream = [];

        nodes.forEach((node) => {
            if (node.id === anchorId) return;

            const isUpstream = edges.some(
                (e) => e.target === anchorId && e.source === node.id
            );
            const isDownstream = edges.some(
                (e) => e.source === anchorId && e.target === node.id
            );

            if (isUpstream) upstream.push(node);
            if (isDownstream) downstream.push(node);
        });

        return { upstream, downstream };
    }

    /**
     * Create aggregate node for hidden nodes
     */
    createAggregateNode(parentId, hiddenNodes, hiddenEdges, direction, batchNumber = 0) {
        if (hiddenNodes.length === 0) return null;

        const nodeTypes = [...new Set(hiddenNodes.map((n) => n.type))];
        const typeLabel =
            nodeTypes.length === 1 && nodeTypes[0] === "table"
                ? "tables"
                : nodeTypes.length === 1 && nodeTypes[0] === "job"
                    ? "jobs"
                    : "nodes";

        return {
            id: `${parentId}_${direction}_agg_${batchNumber}`,
            type: "aggregate",
            label: `... ${hiddenNodes.length} more ${typeLabel}`,
            direction: direction,
            parentId: parentId,
            hiddenNodes: hiddenNodes,
            hiddenEdges: hiddenEdges,
            batchNumber: batchNumber,
        };
    }

    /**
     * Merge expanded graph into existing graph with progressive expansion
     */
    mergeGraph(data, anchorId, direction, hiddenNodes = new Set()) {
        const cy = this.view.getCy();
        if (!cy) return;

        const existingNodes = new Set(cy.nodes().map((n) => n.id()));
        const existingEdges = new Set(cy.edges().map((e) => e.id()));
        const edgeKeys = new Set(
            cy.edges().map((e) => `${e.data("source")}__${e.data("target")}__${e.data("io") || ""}`)
        );

        // Classify nodes by direction
        const { upstream, downstream } = this.classifyNodesByDirection(
            anchorId,
            data.nodes || [],
            data.edges || []
        );

        const nodesToAdd = [];
        const edgesToAdd = [];
        const addedNodeIds = [];
        const upstreamAdded = [];
        const downstreamAdded = [];

        // Process upstream with aggregation
        if (upstream.length > INITIAL_VISIBLE) {
            const visible = upstream.slice(0, INITIAL_VISIBLE);
            const hidden = upstream.slice(INITIAL_VISIBLE);

            nodesToAdd.push(...visible);

            // Get edges for hidden nodes
            const hiddenIds = new Set(hidden.map((n) => n.id));
            const hiddenEdges = (data.edges || []).filter(
                (e) => hiddenIds.has(e.source) || hiddenIds.has(e.target)
            );

            const aggregate = this.createAggregateNode(
                anchorId,
                hidden,
                hiddenEdges,
                "upstream",
                0
            );
            if (aggregate) nodesToAdd.push(aggregate);
        } else {
            nodesToAdd.push(...upstream);
        }

        // Process downstream with aggregation
        if (downstream.length > INITIAL_VISIBLE) {
            const visible = downstream.slice(0, INITIAL_VISIBLE);
            const hidden = downstream.slice(INITIAL_VISIBLE);

            nodesToAdd.push(...visible);

            const hiddenIds = new Set(hidden.map((n) => n.id));
            const hiddenEdges = (data.edges || []).filter(
                (e) => hiddenIds.has(e.source) || hiddenIds.has(e.target)
            );

            const aggregate = this.createAggregateNode(
                anchorId,
                hidden,
                hiddenEdges,
                "downstream",
                0
            );
            if (aggregate) nodesToAdd.push(aggregate);
        } else {
            nodesToAdd.push(...downstream);
        }

        // Add nodes to graph
        nodesToAdd.forEach((raw) => {
            if (hiddenNodes.has(raw.id)) return;
            if (!existingNodes.has(raw.id)) {
                const added = cy.add(this.nodeSerializer.serialize(raw));
                added.addClass("just-added");
                setTimeout(() => added.removeClass("just-added"), 600);
                addedNodeIds.push(raw.id);
                existingNodes.add(raw.id);

                // Track direction
                if (upstream.some((n) => n.id === raw.id)) {
                    upstreamAdded.push(raw.id);
                }
                if (downstream.some((n) => n.id === raw.id)) {
                    downstreamAdded.push(raw.id);
                }
            }
        });

        // Add edges
        (data.edges || []).forEach((edge) => {
            if (hiddenNodes.has(edge.source) || hiddenNodes.has(edge.target)) return;

            // Skip edges for hidden nodes
            const sourceExists = existingNodes.has(edge.source);
            const targetExists = existingNodes.has(edge.target);
            if (!sourceExists || !targetExists) return;

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

            if (edge.target === anchorId && !upstreamAdded.includes(edge.source)) {
                upstreamAdded.push(edge.source);
            }
            if (edge.source === anchorId && !downstreamAdded.includes(edge.target)) {
                downstreamAdded.push(edge.target);
            }
        });

        return {
            addedNodeIds,
            upstreamAdded,
            downstreamAdded,
        };
    }
}

export default GraphExpansion;

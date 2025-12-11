/**
 * GraphNodeSerializer - Serialize and process node data
 * Converts raw node data to format suitable for Cytoscape
 */

export class GraphNodeSerializer {
    /**
     * Serialize a node for Cytoscape rendering
     */
    static serialize(n) {
        const type = n.type || "job";
        const fallback = n.label || n.name || n.job_id || n.full_name || n.id;

        let primary = fallback;
        let secondary = "";

        if (type === "table") {
            const fullName = n.full_name || fallback || "";
            if (fullName.includes(".")) {
                const parts = fullName.split(".");
                primary = parts.pop();
                secondary = parts.join(".");
            } else if (fallback?.includes(".")) {
                const parts = fallback.split(".");
                primary = parts.pop();
                secondary = parts.join(".");
            }
        } else {
            primary = fallback;
            secondary =
                n.schedule ||
                n.metadata?.schedule ||
                n.metadata?.job_type ||
                "";
        }

        const labelText =
            type === "table"
                ? primary
                : secondary
                    ? `${primary}\n${secondary}`
                    : primary;

        const properties = n.properties || {};
        const metadata = n.metadata || {};
        const labels =
            n.labels || properties.labels || metadata.labels || null;
        const owner =
            n.owner || properties.owner || metadata.owner || null;
        const storageType =
            properties.storage_type ||
            metadata.storage_type ||
            properties.storage ||
            metadata.storage ||
            null;
        const partition =
            n.partition ||
            properties.partition ||
            properties.partition_field ||
            metadata.partition ||
            null;
        const createdAt =
            n.created_at ||
            properties.created_at ||
            metadata.created_at ||
            n.updated_at ||
            null;
        const tableOverview =
            properties["table.overview"] ||
            properties.table_overview ||
            metadata["table.overview"] ||
            null;
        const tableSchema =
            properties["table.schema"] ||
            properties.table_schema ||
            metadata["table.schema"] ||
            null;
        const tableActivity =
            properties["table.activity"] ||
            properties.table_activity ||
            metadata["table.activity"] ||
            null;

        return {
            data: {
                id: n.id,
                label: primary,
                label_text: labelText,
                label_length: labelText.length,
                sub_label: secondary,
                type,
                full_name: n.full_name || n.label || null,
                owner,
                description: n.description || metadata.description,
                status: n.status || metadata.status,
                job_id: n.job_id,
                updated_at: n.updated_at,
                storage: storageType,
                partition,
                created_at: createdAt,
                labels,
                properties,
                metadata,
                table_overview: tableOverview,
                table_schema: tableSchema,
                table_activity: tableActivity,
                // Pass-through properties for aggregate nodes
                hiddenNodes: n.hiddenNodes,
                hiddenEdges: n.hiddenEdges,
                parentId: n.parentId,
                direction: n.direction,
                batchNumber: n.batchNumber,
            },
        };
    }
}

export default GraphNodeSerializer;

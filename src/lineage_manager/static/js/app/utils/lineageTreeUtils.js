/**
 * LineageTreeUtils
 * 
 * Responsible for transforming flat lineage data (from backend)
 * into a hierarchical structure suitable for rendering "Git-style" trees.
 */

export const LineageTreeUtils = {
    /**
     * Converts a flat list of items (BFS) into a hierarchically ordered list
     * with 'treePrefix' for visual indentation.
     * 
     * @param {Array} items - Flat list of tables and jobs
     * @returns {Array} - Flat list of TABLES ONLY, ordered by depth/hierarchy, with treePrefix.
     */
    buildFlatTree(items) {
        if (!items || items.length === 0) return [];

        // 1. Convert List to Tree (Map ID -> Node with children)
        const idMap = new Map();
        const roots = [];

        // Initialize map
        items.forEach(item => {
            idMap.set(item.name, { ...item, children: [] });
        });

        // Build Tree Connections
        items.forEach(item => {
            const node = idMap.get(item.name);
            if (item.depth === 0) {
                roots.push(node);
            } else if (item.parent) {
                const parent = idMap.get(item.parent);
                if (parent) {
                    parent.children.push(node);
                }
            }
        });

        // 2. DFS Flatten with Lines
        const flatList = [];

        // Recursive helper
        const traverseLogical = (nodes, prefix) => {
            nodes.forEach((node, index) => {
                // node is typically a JOB (child of a Table)

                const isLast = index === nodes.length - 1;
                const marker = isLast ? "└─ " : "├─ ";
                const nextPrefix = prefix + (isLast ? "&nbsp;&nbsp;&nbsp;" : "│&nbsp;&nbsp;");

                // For each Job, get its children (Tables)
                if (node.children && node.children.length > 0) {
                    node.children.forEach(childTable => {
                        // This childTable is the "Logical Child" of the previous Table
                        flatList.push({
                            ...childTable,
                            treePrefix: prefix + marker,
                            // Embellish with Job info if needed for the view
                            viaJob: node
                        });

                        // Recurse: This table might have its own Jobs...
                        if (childTable.children && childTable.children.length > 0) {
                            traverseLogical(childTable.children, nextPrefix);
                        }
                    });
                }
            });
        };

        // Start Traversal from Root(s)
        if (roots.length > 0) {
            // Add Root First
            // Root has no prefix
            flatList.push({ ...roots[0], treePrefix: "" });

            // Traverse its children (Jobs) to find next tables
            if (roots[0].children) {
                traverseLogical(roots[0].children, "");
            }
        }

        return flatList;
    },

    /**
     * Helper to count items for headers
     */
    getCounts(items) {
        if (!items) return { t: 0, j: 0 };
        const tableCount = items.filter(i => i.type === "TABLE" || i.depth === 0).length;
        const uniqueJobs = new Set(
            items.filter(i => i.type === "JOB").map(i => i.name)
        );
        return { t: tableCount, j: uniqueJobs.size };
    }
};

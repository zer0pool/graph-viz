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
            idMap.set(item.id, { ...item, children: [] });
        });

        // Build Tree Connections
        items.forEach(item => {
            const node = idMap.get(item.id);
            // Use loose equality (==) in case depth comes as a string from some sources
            if (item.depth == 0) {
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
            // Flatten: Table -> [Jobs] -> [Tables]. We want Table -> [Tables]
            // Collect all "Grandchild Tables" from the "Child Jobs"
            let visibleChildren = [];
            nodes.forEach(job => {
                if (job.children && job.children.length > 0) {
                    job.children.forEach(table => {
                        visibleChildren.push({ ...table, viaJob: job });
                    });
                }
            });

            // Sort by name for consistent tree
            visibleChildren.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

            visibleChildren.forEach((table, index) => {
                const isLast = index === visibleChildren.length - 1;
                // const marker = isLast ? "└─ " : "├─ ";
                // const nextPrefix = prefix + (isLast ? "   " : "│  ");


                // marker를 2글자로 단축
                const marker = isLast ? "└ " : "├ ";
                const nextPrefix = prefix + (isLast ? "  " : "│ ");
                flatList.push({
                    ...table,
                    treePrefix: prefix + marker
                });

                // Recurse: If this table has jobs, traverse them
                if (table.children && table.children.length > 0) {
                    traverseLogical(table.children, nextPrefix);
                }
            });
        };

        // Start Traversal from Root(s)
        roots.forEach(rootNode => {
            flatList.push({ ...rootNode, treePrefix: "" });
            if (rootNode.children && rootNode.children.length > 0) {
                traverseLogical(rootNode.children, "");
            }
        });

        return flatList;
    },

    /**
     * Helper to count items for headers
     */
    getCounts(items) {
        if (!items) return { t: 0, j: 0 };
        const tableCount = items.filter(i => (i.type && i.type.toLowerCase() === "table") || i.depth === 0).length;
        const uniqueJobs = new Set(
            items.filter(i => i.type && i.type.toLowerCase() === "job").map(i => i.name)
        );
        return { t: tableCount, j: uniqueJobs.size };
    }
};

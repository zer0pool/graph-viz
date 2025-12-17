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
        const traverseLogical = (jobs, prefix) => {
            // 1. Flatten all "next tables" from all "jobs" into a single sibling list
            const siblings = [];
            jobs.forEach(job => {
                if (job.children && job.children.length > 0) {
                    job.children.forEach(table => {
                        siblings.push({ table, viaJob: job });
                    });
                }
            });

            // 2. Iterate matches standard tree logic
            siblings.forEach((item, index) => {
                const { table, viaJob } = item;
                const isLast = index === siblings.length - 1;

                // Standard Tree Characters
                // ├── for item
                // └── for last item
                const marker = isLast ? "└── " : "├── ";

                // Child prefix:
                // │   for item
                //     for last item
                // (using &nbsp; for HTML rendering safety if needed, or raw chars if <pre>)
                // Using raw chars usually looks better if font is mono, but let's stick to user request "Linux tree command" which implies chars.
                // The current code used &nbsp;. Let's ensure alignment.
                // Linux tree:
                // │   (4 spaces equiv)
                //     (4 spaces)
                // The previous code used &nbsp;&nbsp;&nbsp; (3 spaces).
                // Let's stick to standard chars but maybe use span/pre in UI.
                // Assuming UI handles string 
                const nextPrefix = prefix + (isLast ? "    " : "│   ");

                flatList.push({
                    ...table,
                    treePrefix: prefix + marker,
                    viaJob: viaJob
                });

                // Recurse
                // table.children are Jobs
                if (table.children && table.children.length > 0) {
                    traverseLogical(table.children, nextPrefix);
                }
            });
        };

        // Start Traversal from Root(s)
        if (roots.length > 0) {
            // Add Root First
            flatList.push({ ...roots[0], treePrefix: "" });

            // Root's children are Jobs
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
        const tableCount = items.filter(i => (i.type && i.type.toLowerCase() === "table") || i.depth === 0).length;
        const uniqueJobs = new Set(
            items.filter(i => i.type && i.type.toLowerCase() === "job").map(i => i.name)
        );
        return { t: tableCount, j: uniqueJobs.size };
    }
};

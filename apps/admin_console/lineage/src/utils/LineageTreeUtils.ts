import { GraphNode } from "../types/graph";

export interface LineageItem {
  id: string;
  name: string;
  type: string;
  depth: number;
  parent?: string;
  children?: LineageItem[];
  treePrefix?: string;
  viaJob?: LineageItem;
  properties?: {
    owner?: string;
    description?: string;
    table_type?: string;
    status?: string;
    run_status?: string;
    [key: string]: any;
  };
}

export const LineageTreeUtils = {
  /**
   * Converts a flat list of items (BFS) into a hierarchically ordered list
   * with 'treePrefix' for visual indentation.
   */
  buildFlatTree(
    items: any[],
    expandedGroupIds?: Set<string>,
    limit: number = 20,
  ): LineageItem[] {
    if (!items || items.length === 0) return [];

    // 1. Convert List to Tree (Map ID -> Node with children)
    const idMap = new Map<string, LineageItem>();
    const roots: LineageItem[] = [];

    // Initialize map
    items.forEach((item) => {
      idMap.set(item.id, { ...item, children: [] });
    });

    // Build Tree Connections
    items.forEach((item) => {
      const node = idMap.get(item.id);
      if (!node) return;

      // Use loose equality (==) in case depth comes as a string
      if (item.depth == 0) {
        roots.push(node);
      } else if (item.parent) {
        const parent = idMap.get(item.parent);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    });

    // 2. DFS Flatten with Lines
    const flatList: LineageItem[] = [];

    // Recursive helper
    const traverseLogical = (
      nodes: LineageItem[],
      prefix: string,
      parentId: string,
    ) => {
      // Flatten: Table -> [Jobs] -> [Tables]. We want Table -> [Tables]
      let visibleChildren: LineageItem[] = [];
      nodes.forEach((job) => {
        if (job.children && job.children.length > 0) {
          job.children.forEach((table) => {
            visibleChildren.push({ ...table, viaJob: job });
          });
        }
      });

      // Sort by name for consistent tree
      visibleChildren.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

      // Progressive Loading Logic
      const isExpanded = expandedGroupIds?.has(parentId);
      const totalCount = visibleChildren.length;
      const shouldTruncate = !isExpanded && totalCount > limit;
      const displayList = shouldTruncate
        ? visibleChildren.slice(0, limit)
        : visibleChildren;

      displayList.forEach((table, index) => {
        const isLast = !shouldTruncate && index === displayList.length - 1;
        const marker = isLast ? "└ " : "├ ";
        const nextPrefix = prefix + (isLast ? "  " : "│ ");

        flatList.push({
          ...table,
          treePrefix: prefix + marker,
        });

        // Recurse: If this table has jobs, traverse them
        if (table.children && table.children.length > 0) {
          traverseLogical(table.children, nextPrefix, table.id);
        }
      });

      // Add "MORE" node if truncated
      if (shouldTruncate) {
        const moreCount = totalCount - limit;
        flatList.push({
          id: `more-${parentId}`,
          name: `... ${moreCount} more`,
          type: "MORE",
          depth: 0, // Doesn't matter much for MORE node
          treePrefix: prefix + "└ ",
          properties: { parentId },
        });
      }
    };

    // Start Traversal from Root(s)
    roots.forEach((rootNode) => {
      flatList.push({ ...rootNode, treePrefix: "" });
      if (rootNode.children && rootNode.children.length > 0) {
        traverseLogical(rootNode.children, "", rootNode.id);
      }
    });

    return flatList;
  },

  getCounts(items: any[]) {
    if (!items) return { t: 0, j: 0 };
    const tableCount = items.filter(
      (i) => (i.type && i.type.toLowerCase() === "table") || i.depth === 0,
    ).length;
    const uniqueJobs = new Set(
      items
        .filter((i) => i.type && i.type.toLowerCase() === "job")
        .map((i) => i.name),
    );
    return { t: tableCount, j: uniqueJobs.size };
  },
};

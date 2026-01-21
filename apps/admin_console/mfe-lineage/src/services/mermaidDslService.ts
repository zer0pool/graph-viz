import { GraphState, LayoutOrientation } from "../types/graph";

export interface DslOptions {
  graphData: GraphState;
  orientation: LayoutOrientation;
  layout: "dagre" | "elk";
}

/**
 * Service to generate Mermaid DSL from graph data.
 * Extracted from useMermaidRenderer to promote Single Responsibility.
 */
export class MermaidDslService {
  /**
   * Generates a shortened name for display in the graph nodes.
   */
  static getShortenedName(name: string, type: string): string {
    if (!name) return "";

    let displayName = name;

    if (type === "table") {
      if (name.startsWith("s3://")) {
        const parts = name.substring(5).split("/");
        const bucketName = parts[0];
        displayName = `s3://${bucketName}`;
      } else if (name.includes(".")) {
        const parts = name.split(".");
        displayName = parts[parts.length - 1];
      } else if (name.includes("/")) {
        const parts = name.split("/");
        displayName = parts.filter((p) => p.length > 0).pop() || name;
      }
    }

    // Truncate if still too long (e.g. 25 chars)
    const MAX_LENGTH = 25;
    if (displayName.length > MAX_LENGTH) {
      return displayName.substring(0, MAX_LENGTH - 3) + "...";
    }

    return displayName;
  }

  /**
   * Heavily sanitize ID for Mermaid compatibility (must start with letter, only alphanumeric + underscore)
   */
  static sanitizeId(id: string): string {
    // Replace all non-alphanumeric characters with underscores
    let safe = id.replace(/[^a-zA-Z0-9]/g, "_");
    // Ensure it doesn't start with a number
    if (/^[0-9]/.test(safe)) {
      safe = "n_" + safe;
    }
    return safe;
  }

  /**
   * Generates the complete Mermaid DSL string.
   */
  static generate({ graphData, orientation, layout }: DslOptions): string {
    if (!graphData || graphData.nodes.length === 0) return "";

    // 1. Config Section (Frontmatter)
    let dsl = "---\nconfig:\n";
    dsl += `  layout: ${layout}\n`;
    dsl += "  flowchart:\n";
    dsl += `    defaultRenderer: ${
      layout === "dagre" ? "dagre-wrapper" : "elk"
    }\n`;
    dsl += "---\n";
    dsl += `flowchart ${orientation}\n`;

    // 2. Style Section
    const graphStyles = [
      "  classDef assetNode fill:#FFFFFF,stroke:#D1D5DB,stroke-width:1px,color:#111827,rx:10,ry:10",
      "  classDef groupNode fill:#F8F9FA,stroke:#1A73E8,stroke-width:2px,stroke-dasharray: 5 5,color:#1A73E8,rx:20,ry:20",
      "  linkStyle default stroke:#666666,stroke-width:1.5px,fill:none",
    ].join("\n");

    dsl += graphStyles + "\n\n";

    // 3. Content Section (Nodes)
    graphData.nodes.forEach((node) => {
      const safeId = this.sanitizeId(node.id);

      if (node.type === "group") {
        const label = node.name || "... more";
        dsl += `  ${safeId}("${label}")\n`;
        dsl += `  ${safeId}:::groupNode\n`;
      } else {
        const displayName = this.getShortenedName(
          node.label || node.name,
          node.type,
        );
        const platform =
          (node as any).platform ||
          (node.type === "table" ? "snowflake" : "dbt");

        const richLabel = `<b><font color='#2352DB' size='1'>●</font> ${displayName}</b><br/><hr/><sub>${node.type} | ${platform}</sub>`;
        const escapedLabel = richLabel.replace(/"/g, '\\"');
        const tooltip = (node.label || node.name).replace(/"/g, '\\"');

        dsl += `  ${safeId}@{ label: "${escapedLabel}", tooltip: "${tooltip}" }\n`;
        dsl += `  ${safeId}:::assetNode\n`;
      }
    });

    // 4. Content Section (Edges)
    graphData.edges.forEach((edge) => {
      const safeSource = this.sanitizeId(edge.source);
      const safeTarget = this.sanitizeId(edge.target);
      const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
      const targetNode = graphData.nodes.find((n) => n.id === edge.target);
      let label = "";

      // Label logic including group nodes
      const isUpstreamGroup =
        sourceNode?.type === "group" &&
        sourceNode.properties?.direction === "upstream";
      const isDownstreamGroup =
        targetNode?.type === "group" &&
        targetNode.properties?.direction === "downstream";

      if (sourceNode?.type === "table" || isDownstreamGroup) {
        if (targetNode?.type === "job" || isDownstreamGroup) label = "reads";
      } else if (sourceNode?.type === "job" || isUpstreamGroup) {
        if (targetNode?.type === "table" || isUpstreamGroup) label = "writes";
      }

      const arrow = label ? `-- ${label} -->` : "-->";
      dsl += `  ${safeSource} ${arrow} ${safeTarget}\n`;
    });

    console.log(
      "[MermaidDsl] Generated DSL (First 500 chars):\n",
      dsl.substring(0, 500),
    );
    return dsl;
  }
}

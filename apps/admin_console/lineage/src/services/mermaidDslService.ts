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
    if (type !== "table") return name;

    if (name.startsWith("s3://")) {
      const parts = name.substring(5).split("/");
      const bucketName = parts[0];
      return `s3://${bucketName}`;
    }

    if (name.includes(".")) {
      const parts = name.split(".");
      return parts[parts.length - 1];
    }

    if (name.includes("/")) {
      const parts = name.split("/");
      return parts.filter((p) => p.length > 0).pop() || name;
    }

    return name;
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

    // 2. Style Section (Injectable Styles)
    const graphStyles = [
      "  classDef assetNode fill:#FFFFFF,stroke:#D1D5DB,stroke-width:1px,color:#111827,rx:10,ry:10",
      "  linkStyle default stroke:#666666,stroke-width:1.5px,fill:none",
    ].join("\n");

    dsl += graphStyles + "\n\n";

    // 3. Content Section (Nodes)
    graphData.nodes.forEach((node) => {
      const safeId = node.id.replace(/:/g, "_");
      const displayName = this.getShortenedName(
        node.label || node.name,
        node.type
      );
      const platform =
        (node as any).platform || (node.type === "table" ? "snowflake" : "dbt");

      const richLabel = `<b><font color='#2352DB' size='1'>●</font> ${displayName}</b><br/><hr/><sub>${node.type} | ${platform}</sub>`;
      const escapedLabel = richLabel.replace(/"/g, '\\"');

      dsl += `  ${safeId}@{ label: "${escapedLabel}" }\n`;
      dsl += `  ${safeId}:::assetNode\n`;
    });

    // 4. Content Section (Edges)
    graphData.edges.forEach((edge) => {
      const safeSource = edge.source.replace(/:/g, "_");
      const safeTarget = edge.target.replace(/:/g, "_");
      const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
      const targetNode = graphData.nodes.find((n) => n.id === edge.target);
      let label = "";

      if (sourceNode?.type === "table" && targetNode?.type === "job") {
        label = "reads";
      } else if (sourceNode?.type === "job" && targetNode?.type === "table") {
        label = "writes";
      }

      const arrow = label ? `-- ${label} -->` : "-->";
      dsl += `  ${safeSource} ${arrow} ${safeTarget}\n`;
    });

    return dsl;
  }
}

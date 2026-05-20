import { GraphState, LayoutOrientation } from "../types/graph";

export interface DslOptions {
  graphData: GraphState;
  orientation: LayoutOrientation;
  layout: "dagre" | "elk";
  selectedNodeId?: string;
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

    // Truncate if still too long - shorter for better UI
    const MAX_LENGTH = 20;
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
  static generate({ graphData, orientation, layout, selectedNodeId }: DslOptions): string {
    if (!graphData || graphData.nodes.length === 0) return "";

    console.log("[MermaidDslService.generate] Called with selectedNodeId:", selectedNodeId, "nodes count:", graphData.nodes.length);

    // 1. Config Section (Directive style is often more reliable in v11)
    let dsl = `%%{init: {"flowchart": {"defaultRenderer": "${layout === "dagre" ? "dagre-wrapper" : "elk"}"}}}%%\n`;
    dsl += `flowchart ${orientation}\n`;

    // 2. Style Section
    const graphStyles = [
      "  classDef tableNode fill:#E8F0FE,stroke:#1A73E8,stroke-width:1px,color:#111827,rx:10,ry:10",
      "  classDef jobNode fill:#E6F4EA,stroke:#1E8E3E,stroke-width:1px,color:#111827,rx:10,ry:10",
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
        // Use full name if node is selected, otherwise use shortened name
        const isSelected = selectedNodeId === node.id;
        const displayName = isSelected
          ? (node.label || node.name)
          : this.getShortenedName(node.label || node.name, node.type);
        if (isSelected) {
          console.log("[MermaidDslService.generate] Node " + node.id + " is SELECTED - using full name: " + displayName);
        }
        const platform =
          (node as any).platform || (node.type === "table" ? "bigquery" : "bigquery");

        const richLabel =
          `<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;padding:2px 4px;margin:0;height:auto;white-space:nowrap;box-sizing:border-box;'><div style='font-weight:bold;font-size:11px;margin:0;'>${displayName}</div><div style='width:100%;height:1px;background:rgba(0,0,0,0.1);margin:1px 0;'></div><div style='font-size:10px;color:#666;margin:0;'>${node.type} | ${platform}</div></div>`.replace(
            />\s+</g,
            "><"
          );
        const escapedLabel = richLabel.replace(/"/g, '\\"');
        const tooltip = (node.label || node.name).replace(/"/g, '\\"');

        dsl += `  ${safeId}@{ label: "${escapedLabel}", tooltip: "${tooltip}" }\n`;
        dsl += `  ${safeId}:::${node.type === "table" ? "tableNode" : "jobNode"}\n`;
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
        sourceNode?.type === "group" && sourceNode.properties?.direction === "upstream";
      const isDownstreamGroup =
        targetNode?.type === "group" && targetNode.properties?.direction === "downstream";

      if (sourceNode?.type === "table" || isDownstreamGroup) {
        if (targetNode?.type === "job" || isDownstreamGroup) label = "reads";
      } else if (sourceNode?.type === "job" || isUpstreamGroup) {
        if (targetNode?.type === "table" || isUpstreamGroup) label = "writes";
      }

      const arrow = label ? `-- ${label} -->` : "-->";
      dsl += `  ${safeSource} ${arrow} ${safeTarget}\n`;
    });

    return dsl;
  }
}

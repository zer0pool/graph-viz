import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidGraphProps {
  chart: string;
  onNodeClick?: (nodeId: string) => void;
  loading?: boolean;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  fontFamily: "Inter, sans-serif",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "basis",
  },
});

export const MermaidGraph: React.FC<MermaidGraphProps> = ({
  chart,
  onNodeClick,
  loading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart || loading) return;

    let mounted = true;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (mounted) {
          setSvg(svg);
          setRenderError(null);
        }
      } catch (err) {
        console.error("Mermaid rendering failed:", err);
        if (mounted) setRenderError("Failed to render graph syntax");
      }
    };

    renderChart();
    return () => {
      mounted = false;
    };
  }, [chart, loading]);

  // Click handling logic (delegation)
  useEffect(() => {
    if (!containerRef.current || !onNodeClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find closest node container (mermaid usually generates classes like 'node', 'cluster', etc.)
      // This part depends heavily on how mermaid renders nodes.
      // For standard flowchart, nodes are in g.node
      const nodeGroup = target.closest(".node");
      if (nodeGroup) {
        const nodeId = nodeGroup.id;
        // Mermaid often modifies IDs (e.g., "flowchart-id-nodeid").
        // We might need a robust way to extract the original ID or rely on click events defined in the chart string.
        // Constraint check: "View relies on event bubbling."

        // Simpler approach for now: if the chart has `click nodeId call callback()` syntax,
        // mermaid attaches to window. But we explicitly forbade global window pollution.
        // So we must inspect elements or enforce a specific SVG structure.

        // For this phase, we'll try to extract the ID from the SVG element id if possible,
        // or assume the user clicks a specifically tagged element.
        if (nodeId) {
          // Extract raw ID if mermaid prefixes it.
          // E.g. "flowchart-myNode-123" -> "myNode"
          // This part needs refinement during Visual Check phase.
          onNodeClick(nodeId);
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [svg, onNodeClick]);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-400">Rendering Graph...</div>
    );
  if (renderError)
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded">
        {renderError}
      </div>
    );

  return (
    <div
      ref={containerRef}
      className="mermaid-container overflow-auto border border-gray-100 rounded bg-white p-4 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

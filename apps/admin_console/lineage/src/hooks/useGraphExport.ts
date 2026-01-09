import { useCallback } from "react";

/**
 * Hook to manage graph export (SVG download).
 * Extracted from App.tsx to reduce container complexity.
 */
export function useGraphExport(mermaidRef: React.RefObject<HTMLDivElement>) {
  const handleDownload = useCallback(() => {
    if (!mermaidRef.current) return;
    const originalSvg = mermaidRef.current.querySelector("svg");
    if (!originalSvg) return;

    // 1. Clone the SVG to avoid modifying the UI
    const clonedSvg = originalSvg.cloneNode(true) as SVGSVGElement;

    // 2. Append to a hidden container to measure REAL dimensions (BBox)
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.top = "-9999px";
    hiddenContainer.style.visibility = "hidden";
    hiddenContainer.appendChild(clonedSvg);
    document.body.appendChild(hiddenContainer);

    try {
      // 3. Reset transforms on the inner graph to get "native" coordinate space
      const innerG = clonedSvg.querySelector(".mermaid-inner-graph");
      if (innerG) {
        innerG.removeAttribute("transform");
      }

      // 4. Baking in the Edge Fix (Definitive)
      const allPaths = clonedSvg.querySelectorAll("path");
      allPaths.forEach((path) => {
        const isInNode = !!path.closest(".node, .assetNode");
        if (!isInNode) {
          path.style.fill = "none";
          path.setAttribute("fill", "none");
          path.style.stroke = "#666666";
          path.style.strokeWidth = "1.5px";
        }
      });

      // 5. Measure the TRUE content bounds
      const targetG = clonedSvg.querySelector(
        ".mermaid-inner-graph, .mermaid svg > g"
      ) as SVGGraphicsElement;

      if (targetG) {
        const bbox = targetG.getBBox();
        const padding = 50;

        const viewBoxX = bbox.x - padding;
        const viewBoxY = bbox.y - padding;
        const viewBoxWidth = bbox.width + padding * 2;
        const viewBoxHeight = bbox.height + padding * 2;

        clonedSvg.setAttribute(
          "viewBox",
          `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
        );
        clonedSvg.setAttribute("width", viewBoxWidth.toString());
        clonedSvg.setAttribute("height", viewBoxHeight.toString());
        clonedSvg.removeAttribute("style");
      }

      // 6. Define critical CSS
      const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        svg { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; }
        path:not([class*='node']):not([class*='assetNode']) { fill: none !important; }
        .assetNode > rect, .assetNode > polygon, .assetNode > path, .assetNode > circle, .node path, .node rect {
          fill: #ffffff !important;
          stroke: #d1d5db !important;
          stroke-width: 1px !important;
        }
        .assetNode .nodeLabel { color: #111827 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; font-size: 11px; }
        .assetNode hr { border: none; border-top: 1px solid #E5E7EB; margin: 0 !important; width: 100%; }
        .assetNode sub { color: #6B7280; font-size: 8px; line-height: 1; }
        .edgeLabel { background-color: #ffffff !important; }
        .edgeLabel text { fill: #5f6368 !important; font-size: 11px !important; font-weight: 500 !important; }
        foreignObject { overflow: visible !important; }
        foreignObject > div { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100%; height: 100%; }
      `;

      const style = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "style"
      );
      style.textContent = css;
      clonedSvg.insertBefore(style, clonedSvg.firstChild);

      // 7. Serialize and Download
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lineage_graph_full_${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      document.body.removeChild(hiddenContainer);
    }
  }, [mermaidRef]);

  return { handleDownload };
}

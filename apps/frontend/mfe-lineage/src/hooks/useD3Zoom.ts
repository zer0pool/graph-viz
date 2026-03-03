import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

interface UseD3ZoomOptions {
  mermaidRef: React.RefObject<HTMLDivElement>;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

/**
 * Hook to manage D3 Zoom behavior for the Mermaid SVG.
 * Extracted from useMermaidRenderer to isolate D3-specific logic.
 */
export function useD3Zoom({ mermaidRef, onInteractionStart, onInteractionEnd }: UseD3ZoomOptions) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);

  useEffect(() => {
    if (!mermaidRef.current) return;

    const zoomBehavior = d3
      .zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("start", () => {
        if (mermaidRef.current) {
          mermaidRef.current.classList.add("grabbing");
        }
        if (onInteractionStart) onInteractionStart();
      })
      .on("zoom", (event) => {
        if (onInteractionStart) onInteractionStart();
        const svg = mermaidRef.current?.querySelector("svg");
        const innerG = svg?.querySelector("g");
        if (innerG) {
          d3.select(innerG).attr("transform", (event.transform as any).toString());
          setZoomLevel(event.transform.k);
          setPan({ x: event.transform.x, y: event.transform.y });
        }
      })
      .on("end", () => {
        if (mermaidRef.current) {
          mermaidRef.current.classList.remove("grabbing");
        }
        if (onInteractionEnd) onInteractionEnd();
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(mermaidRef.current as any).call(zoomBehavior);

    return () => {
      d3.select(mermaidRef.current as any).on(".zoom", null);
    };
  }, [mermaidRef, onInteractionStart, onInteractionEnd]);

  const fitToView = useCallback(() => {
    if (!mermaidRef.current || !zoomBehaviorRef.current) return;
    const svg = mermaidRef.current.querySelector("svg");
    const innerG = svg?.querySelector("g");
    if (!svg || !innerG) return;

    const containerRect = mermaidRef.current.getBoundingClientRect();
    const graphBBox = (innerG as SVGGraphicsElement).getBBox();

    const widthScale = containerRect.width / graphBBox.width;
    const heightScale = containerRect.height / graphBBox.height;
    const scale = Math.min(widthScale, heightScale) * 0.9;
    const finalScale = Math.min(scale, 2);

    const cx = containerRect.width / 2;
    const cy = containerRect.height / 2;

    const x = cx - finalScale * (graphBBox.x + graphBBox.width / 2);
    const y = cy - finalScale * (graphBBox.y + graphBBox.height / 2);

    const transform = d3.zoomIdentity.translate(x, y).scale(finalScale);
    d3.select(mermaidRef.current as any).call(zoomBehaviorRef.current.transform as any, transform);
  }, [mermaidRef]);

  const resetView = useCallback(() => {
    if (!mermaidRef.current || !zoomBehaviorRef.current) return;
    const svg = mermaidRef.current.querySelector("svg");
    const innerG = svg?.querySelector("g");
    if (!svg || !innerG) return;

    const containerRect = mermaidRef.current.getBoundingClientRect();
    const graphBBox = (innerG as SVGGraphicsElement).getBBox();

    const scale = 1.0;
    const cx = containerRect.width / 2;
    const cy = containerRect.height / 2;

    const x = cx - scale * (graphBBox.x + graphBBox.width / 2);
    const y = cy - scale * (graphBBox.y + graphBBox.height / 2);

    const transform = d3.zoomIdentity.translate(x, y).scale(scale);

    d3.select(mermaidRef.current as any)
      .transition()
      .duration(750)
      .call(zoomBehaviorRef.current.transform as any, transform);
  }, [mermaidRef]);

  const zoomIn = useCallback(() => {
    if (!mermaidRef.current || !zoomBehaviorRef.current) return;
    d3.select(mermaidRef.current as any)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy as any, 1.2);
  }, [mermaidRef]);

  const zoomOut = useCallback(() => {
    if (!mermaidRef.current || !zoomBehaviorRef.current) return;
    d3.select(mermaidRef.current as any)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy as any, 0.8);
  }, [mermaidRef]);

  return {
    zoomLevel,
    pan,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    zoomBehaviorRef,
    setZoomLevel,
    setPan,
  };
}

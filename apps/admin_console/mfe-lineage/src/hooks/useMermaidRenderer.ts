import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import mermaid from "mermaid";
import * as d3 from "d3";
import {
  GraphState,
  GraphNode,
  LayoutOrientation,
  ContextMenuState,
  SelectHandler,
} from "../types/graph";
import { MermaidDslService } from "../services/mermaidDslService";
import { useD3Zoom } from "./useD3Zoom";

interface UseMermaidRendererOptions {
  graphData: GraphState | null;
  orientation: LayoutOrientation;
  onSelect?: SelectHandler;
  onSmartExpand?: () => void;
  onExpandGroup?: (node: GraphNode) => void;
  layout: "dagre" | "elk";
}

export function useMermaidRenderer({
  graphData,
  orientation,
  onSelect,
  onSmartExpand,
  onExpandGroup,
  layout,
}: UseMermaidRendererOptions) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const prevOrientationRef = useRef<LayoutOrientation>(orientation);
  const prevLayoutRef = useRef<"dagre" | "elk">(layout);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const selectNode = useCallback(
    (node: GraphNode | null, action?: "click" | "showDetail") => {
      setSelectedNode(node);
      if (onSelect) {
        if (!node) {
          onSelect(null);
        } else {
          onSelect({
            type: node.type as any,
            id: node.id,
            jobId: node.type === "job" ? node.id : undefined,
            tableName:
              node.type === "table" ? node.full_name || node.name : undefined,
            action,
          });
        }
      }
    },
    [onSelect],
  );

  const {
    zoomLevel,
    pan,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    zoomBehaviorRef,
    setZoomLevel,
    setPan,
  } = useD3Zoom({
    mermaidRef,
    onInteractionStart: () => setContextMenu(null),
  });

  // Background click to deselect
  useEffect(() => {
    if (!mermaidRef.current) return;
    d3.select(mermaidRef.current as any).on("click", (event) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "svg" ||
        target.id === "mermaid-container"
      ) {
        selectNode(null);
        setContextMenu(null);
      }
    });
  }, [selectNode]);

  // Effect to toggle .selected class on nodes when state changes
  useEffect(() => {
    if (!mermaidRef.current) return;
    const container = mermaidRef.current;

    const previousSelected = container.querySelectorAll(".node.selected");
    previousSelected.forEach((el) => el.classList.remove("selected"));

    if (selectedNode) {
      const nodeEls = container.querySelectorAll(
        "g.node, .jobNode, .tableNode, [id*='flowchart-']",
      );
      const safeId = MermaidDslService.sanitizeId(selectedNode.id);

      nodeEls.forEach((el) => {
        if (el.id.includes(safeId)) {
          el.classList.add("selected");
        }
      });
    }
  }, [selectedNode]);

  const onSmartExpandRef = useRef(onSmartExpand);
  useEffect(() => {
    onSmartExpandRef.current = onSmartExpand;
  }, [onSmartExpand]);

  const dsl = useMemo(() => {
    return MermaidDslService.generate({
      graphData: graphData!,
      orientation,
      layout,
    });
  }, [graphData, orientation, layout]);

  useEffect(() => {
    if (!dsl || !mermaidRef.current) return;

    let isCancelled = false;

    const renderGraph = async () => {
      try {
        const container = mermaidRef.current;
        if (!container || isCancelled) return;

        // Clear previous content
        container.innerHTML = "";
        container.setAttribute("data-layout", layout);


        // Set stable config
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: layout === "dagre" ? "basis" : "linear",
            nodeSpacing: 50,
            rankSpacing: 50,
            padding: 10, // Significantly increase for standard nodes (like Group)
            defaultRenderer: layout === "dagre" ? "dagre-wrapper" : "elk",
          } as any,
          themeVariables: {
            fontSize: "12px",
            fontFamily: "Inter, -apple-system, sans-serif",
            labelPadding: 10,
            nodePadding: 20,
            primaryColor: "#E8F0FE",
            primaryBorderColor: "#1A73E8",
            primaryTextColor: "#202124",
            lineColor: "#666666",
            secondaryColor: "#E6F4EA",
            secondaryBorderColor: "#1E8E3E",
          },
        });

        const renderId = "mermaid-svg-" + Math.floor(Math.random() * 10000);
        const { svg } = await (mermaid as any).render(renderId, dsl, container);
        
        if (isCancelled) return;
        container.innerHTML = svg;

        const newSvg = container.querySelector("svg");
        if (newSvg) {
          newSvg.style.width = "100%";
          newSvg.style.height = "100%";
          newSvg.setAttribute("id", "mermaid-main-svg");
          newSvg.removeAttribute("viewBox");
          newSvg.removeAttribute("width");
          newSvg.removeAttribute("height");

          let innerG = newSvg.querySelector("g");
          if (!innerG) {
            innerG = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g",
            );
            innerG.innerHTML = newSvg.innerHTML;
            newSvg.innerHTML = "";
            newSvg.appendChild(innerG);
          }
          innerG.classList.add("mermaid-inner-graph");

          const containerRect = container.getBoundingClientRect();
          const graphBBox = (innerG as SVGGraphicsElement).getBBox();

          const isOrientationChange =
            prevOrientationRef.current !== orientation;
          const isLayoutChange = prevLayoutRef.current !== layout;
          const isInitialLoad = pan.x === 0 && pan.y === 0 && zoomLevel === 1;
          const isFullReload = graphData ? graphData.nodes.length < 5 : true;

          if (isInitialLoad || isLayoutChange || (isFullReload && !isOrientationChange)) {
            const scale = 1.0;
            const cx = containerRect.width / 2;
            const cy = containerRect.height / 2;
            const x = cx - scale * (graphBBox.x + graphBBox.width / 2);
            const y = cy - scale * (graphBBox.y + graphBBox.height / 2);

            const transform = d3.zoomIdentity.translate(x, y).scale(scale);
            d3.select(innerG).attr("transform", transform.toString());

            if (zoomBehaviorRef.current && container) {
              d3.select(container).call(
                zoomBehaviorRef.current.transform as any,
                transform,
              );
            }
            setZoomLevel(scale);
            setPan({ x, y });
            prevLayoutRef.current = layout;
          } else if (isOrientationChange) {
            const scale = zoomLevel;
            const cx = containerRect.width / 2;
            const cy = containerRect.height / 2;
            const x = cx - scale * (graphBBox.x + graphBBox.width / 2);
            const y = cy - scale * (graphBBox.y + graphBBox.height / 2);

            const transform = d3.zoomIdentity.translate(x, y).scale(scale);
            d3.select(innerG).attr("transform", transform.toString());

            if (zoomBehaviorRef.current && container) {
              d3.select(container).call(
                zoomBehaviorRef.current.transform as any,
                transform,
              );
            }
            setPan({ x, y });
            prevOrientationRef.current = orientation;
          } else {
            const transform = d3.zoomIdentity
              .translate(pan.x, pan.y)
              .scale(zoomLevel);
            d3.select(innerG).attr("transform", transform.toString());
          }
        }

        const nodeEls = container.querySelectorAll(
          "g.node, .jobNode, .tableNode, [id*='flowchart-']",
        );
        nodeEls.forEach((el) => {
          const matches =
            graphData?.nodes.filter((n) => {
              const safeId = MermaidDslService.sanitizeId(n.id);
              return el.id.includes(safeId);
            }) || [];

          // Sort by ID length descending to prefer group nodes over anchors
          matches.sort((a, b) => b.id.length - a.id.length);
          const nodeIdMatch = matches[0];

          if (nodeIdMatch) {
            const node = nodeIdMatch;
            (el as HTMLElement).style.cursor = "pointer";

            const handleNodeAction = (e: MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();

              // selectNode(node, "click");

              // NEW: Handle Group Node Expansion
              if (node.type === "group" && onExpandGroup) {
                onExpandGroup(node);
                return;
              }

              const rect = el.getBoundingClientRect();
              selectNode(node, "click");
              setContextMenu({
                x: rect.left + rect.width / 2,
                y: rect.top - 12,
                node,
              });
            };

            el.addEventListener("mousedown", handleNodeAction as any);
            el.addEventListener("contextmenu", handleNodeAction as any);
            el.addEventListener("dblclick", (e) => {
              e.stopPropagation();

              if (node.type === "group" && onExpandGroup) {
                onExpandGroup(node);
                return;
              }

              if (onSmartExpandRef.current) onSmartExpandRef.current();
            });
          }
        });
      } catch (err) {
        console.error("Mermaid render error:", err);
      }
    };
    renderGraph();

    return () => {
      isCancelled = true;
    };
  }, [dsl]);

  return {
    mermaidRef,
    zoomLevel,
    pan,
    selectedNode,
    contextMenu,
    setContextMenu,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    selectNode,
    dsl,
  };
}

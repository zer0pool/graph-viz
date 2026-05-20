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
  console.log("[useMermaidRenderer] Hook initialized with graphData:", graphData?.nodes.length, "nodes");
  const mermaidRef = useRef<HTMLDivElement>(null);
  const prevOrientationRef = useRef<LayoutOrientation>(orientation);
  const prevLayoutRef = useRef<"dagre" | "elk">(layout);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  console.log("[useMermaidRenderer] State initialized, selectedNode:", selectedNode?.id);

  const selectNode = useCallback(
    (node: GraphNode | null, action?: "click" | "showDetail") => {
      console.log("[selectNode] Called with node:", node ? { id: node.id, name: node.name, type: node.type } : null, "action:", action);
      setSelectedNode(node);
      if (onSelect) {
        if (!node) {
          onSelect(null);
        } else {
          onSelect({
            type: node.type as any,
            id: node.id,
            jobId: node.type === "job" ? node.id : undefined,
            tableName: node.type === "table" ? node.full_name || node.name : undefined,
            action,
          });
        }
      }
    },
    [onSelect]
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
      if (target.tagName.toLowerCase() === "svg" || target.id === "mermaid-container") {
        selectNode(null);
        setContextMenu(null);
      }
    });
  }, [selectNode]);


  const onSmartExpandRef = useRef(onSmartExpand);
  useEffect(() => {
    onSmartExpandRef.current = onSmartExpand;
  }, [onSmartExpand]);

  const dsl = useMemo(() => {
    const newDsl = MermaidDslService.generate({
      graphData: graphData!,
      orientation,
      layout,
      selectedNodeId: selectedNode?.id,
    });
    console.log("[DSL Memo] Recomputed DSL. selectedNodeId:", selectedNode?.id, "graphNodes:", graphData?.nodes.length, "dsl preview:", newDsl.split('\n').slice(0, 10).join('\n'));
    return newDsl;
  }, [graphData, orientation, layout, selectedNode]);

  useEffect(() => {
    if (!dsl || !mermaidRef.current) return;

    console.log("[renderGraph Effect] Starting render. selectedNode:", selectedNode ? { id: selectedNode.id, name: selectedNode.name } : null);

    let isCancelled = false;

    const renderGraph = async () => {
      try {
        console.log("[renderGraph] Rendering started...");
        const container = mermaidRef.current;
        if (!container || isCancelled) return;
        console.log("[renderGraph] Container ready");

        // Clear previous content
        container.innerHTML = "";
        container.setAttribute("data-layout", layout);

        // Set minimal config with compact spacing
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: false,
            htmlLabels: false,
            defaultRenderer: layout === "dagre" ? "dagre-wrapper" : "elk",
            padding: 0,
            nodeSpacing: 20,
            rankSpacing: 40,
          } as any,
        });

        const renderId = "mermaid-svg-" + Math.floor(Math.random() * 10000);
        console.log("[renderGraph] Calling mermaid.render with dsl lines:", dsl.split('\n').length);
        const { svg } = await (mermaid as any).render(renderId, dsl, container);

        if (isCancelled) {
          console.log("[renderGraph] Render cancelled, returning");
          return;
        }
        console.log("[renderGraph] SVG rendered, inserting into container");
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
            innerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            innerG.innerHTML = newSvg.innerHTML;
            newSvg.innerHTML = "";
            newSvg.appendChild(innerG);
          }
          innerG.classList.add("mermaid-inner-graph");

          const containerRect = container.getBoundingClientRect();
          const graphBBox = (innerG as SVGGraphicsElement).getBBox();

          const isOrientationChange = prevOrientationRef.current !== orientation;
          const isLayoutChange = prevLayoutRef.current !== layout;
          const isInitialLoad = pan.x === 0 && pan.y === 0 && zoomLevel === 1;
          const isFullReload = graphData ? graphData.nodes.length < 5 : true;
          const isNodeSelectionChange = selectedNode !== undefined;

          console.log("[renderGraph Layout] Conditions:", {
            isInitialLoad,
            isLayoutChange,
            isNodeSelectionChange,
            isFullReload,
            isOrientationChange,
            selectedNodeId: selectedNode?.id,
            pan,
            zoomLevel,
          });

          if (isInitialLoad || isLayoutChange || isNodeSelectionChange || (isFullReload && !isOrientationChange)) {
            console.log("[renderGraph Layout] Triggering layout recalculation (isNodeSelectionChange, etc.)");
            const scale = 1.0;
            const cx = containerRect.width / 2;
            const cy = containerRect.height / 2;
            const x = cx - scale * (graphBBox.x + graphBBox.width / 2);
            const y = cy - scale * (graphBBox.y + graphBBox.height / 2);

            const transform = d3.zoomIdentity.translate(x, y).scale(scale);
            d3.select(innerG).attr("transform", transform.toString());

            if (zoomBehaviorRef.current && container) {
              d3.select(container).call(zoomBehaviorRef.current.transform as any, transform);
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
              d3.select(container).call(zoomBehaviorRef.current.transform as any, transform);
            }
            setPan({ x, y });
            prevOrientationRef.current = orientation;
          } else {
            const transform = d3.zoomIdentity.translate(pan.x, pan.y).scale(zoomLevel);
            d3.select(innerG).attr("transform", transform.toString());
          }
        }

        // Apply .selected class to selected node after SVG is fully rendered
        console.log("[renderGraph Selected Class] Starting to apply selected class. selectedNode:", selectedNode?.id);
        const previousSelected = container.querySelectorAll(".node.selected");
        console.log("[renderGraph Selected Class] Found " + previousSelected.length + " previously selected elements, removing class");
        previousSelected.forEach((el) => el.classList.remove("selected"));

        if (selectedNode) {
          const selectedNodeEls = container.querySelectorAll(
            "g.node, .jobNode, .tableNode, [id*='flowchart-']"
          );
          console.log("[renderGraph Selected Class] Found " + selectedNodeEls.length + " total node elements");
          const safeId = MermaidDslService.sanitizeId(selectedNode.id);
          console.log("[renderGraph Selected Class] Looking for node with ID containing: " + safeId);

          let found = false;
          selectedNodeEls.forEach((el) => {
            const elId = el.id;
            if (elId.includes(safeId)) {
              console.log("[renderGraph Selected Class] FOUND match! Element ID: " + elId + " adding .selected class");
              el.classList.add("selected");
              found = true;
            }
          });

          if (!found) {
            console.warn("[renderGraph Selected Class] NO MATCH FOUND for safeId: " + safeId);
            const availableIds = Array.from(selectedNodeEls).map((el: any) => el.id).slice(0, 10);
            console.warn("[renderGraph Selected Class] Available element IDs: " + JSON.stringify(availableIds));
          }
        } else {
          console.log("[renderGraph Selected Class] No selectedNode, skipping class application");
        }

        const nodeEls = container.querySelectorAll(
          "g.node, .jobNode, .tableNode, [id*='flowchart-']"
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
        console.log("[renderGraph] Render complete! Event listeners attached to", nodeEls.length, "nodes");
      } catch (err) {
        console.error("[renderGraph] RENDER ERROR:", err);
      }
    };
    renderGraph();

    return () => {
      console.log("[renderGraph Effect] Cleanup: setting isCancelled = true");
      isCancelled = true;
    };
  }, [dsl, selectedNode]);

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

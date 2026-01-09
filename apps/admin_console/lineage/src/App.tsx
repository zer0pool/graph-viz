import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles/lineage.css";
import { Selection, SelectHandler, LayoutOrientation } from "./types/graph";
import { useGraphData } from "./hooks/useGraphData";
import { useMermaidRenderer } from "./hooks/useMermaidRenderer";
import { ControlBar } from "./components/ControlBar/ControlBar";
import { ContextMenu } from "./components/ContextMenu";
import { GraphCanvas } from "./components/GraphCanvas";
import { Legend } from "./components/Legend";
import { StatusBar } from "./components/StatusBar";
import { ViewMode } from "./components/ControlBar/ViewToggle";
import { LayoutType } from "./components/ControlBar/LayoutControls";
import { useGraphExport } from "./hooks/useGraphExport";

interface AppProps {
  rootNode?: Selection | null;
  onSelect?: SelectHandler;
}

const App: React.FC<AppProps> = ({ rootNode, onSelect }) => {
  const [orientation, setOrientation] = useState<LayoutOrientation>("LR");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [layout, setLayout] = useState<LayoutType>("dagre");

  const {
    graphData,
    loading,
    error,
    fetchGraph,
    removeNode,
    resetToInitial,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGraphData();

  const handleSmartExpand = useCallback(async () => {
    if (!selectedNodeRef.current) return;
    const node = selectedNodeRef.current;
    if (!graphData) return;

    const hasIncoming = graphData.edges.some((e) => e.target === node.id);
    const hasOutgoing = graphData.edges.some((e) => e.source === node.id);

    let direction: "upstream" | "downstream" | "both" = "both";
    if (hasIncoming && !hasOutgoing) direction = "downstream";
    else if (!hasIncoming && hasOutgoing) direction = "upstream";

    await fetchGraph(node.type, node.id, true, direction);
  }, [graphData, fetchGraph]);

  // Use a ref for selectedNode to avoid handleSmartExpand dependency on state itself if possible,
  // or just keep it as is if useCallback is stable enough.
  // Actually handleSmartExpand depends on selectedNode.

  // Rendering Hook
  const {
    mermaidRef,
    zoomLevel,
    selectedNode,
    contextMenu,
    setContextMenu,
    fitToView,
    resetView,
    zoomIn,
    zoomOut,
    dsl,
  } = useMermaidRenderer({
    graphData,
    orientation,
    onSelect,
    onSmartExpand: handleSmartExpand,
    layout,
  });

  // Keep a ref to selectedNode for the handler to avoid closure issues
  const selectedNodeRef = useRef(selectedNode);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  const handleExpandExplicit = useCallback(
    async (dir: "upstream" | "downstream") => {
      if (!selectedNode) return;
      await fetchGraph(selectedNode.type, selectedNode.id, true, dir);
    },
    [selectedNode, fetchGraph]
  );

  const { handleDownload } = useGraphExport(mermaidRef);

  const handleCopyMermaid = useCallback(() => {
    if (!dsl) return;
    navigator.clipboard.writeText(dsl).then(() => {
      // Could add a toast here later
      console.log("Mermaid DSL copied to clipboard");
    });
  }, [dsl]);

  // Initial Load from props
  const lastFetchedNode = useRef<{ type: string; id: string } | null>(null);

  useEffect(() => {
    if (rootNode?.id) {
      if (
        lastFetchedNode.current?.id !== rootNode.id ||
        lastFetchedNode.current?.type !== rootNode.type
      ) {
        fetchGraph(rootNode.type, rootNode.id, false, "both", true);
        lastFetchedNode.current = { type: rootNode.type, id: rootNode.id };
      }
    }
  }, [rootNode, fetchGraph]);

  // Global Event Listeners (Logic Parity with graphControllerNew.js)
  useEffect(() => {
    const handleViewInGraph = (e: any) => {
      const { nodeId } = e.detail;
      if (!nodeId) return;

      const [type, id] = nodeId.includes(":")
        ? nodeId.split(":")
        : ["job", nodeId];
      fetchGraph(type, id, false, "both", true);
    };

    document.addEventListener("job-detail:view-in-graph", handleViewInGraph);
    document.addEventListener("table-detail:view-in-graph", handleViewInGraph);

    return () => {
      document.removeEventListener(
        "job-detail:view-in-graph",
        handleViewInGraph
      );
      document.removeEventListener(
        "table-detail:view-in-graph",
        handleViewInGraph
      );
    };
  }, [fetchGraph]);

  const handleReset = useCallback(() => {
    resetToInitial();
    // Use resetView to center at 100%
    setTimeout(resetView, 100);
  }, [resetToInitial, resetView]);

  return (
    <div className="lineage-container">
      <ControlBar
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={handleReset}
        onFit={fitToView}
        onRotate={setOrientation}
        onDownloadSVG={handleDownload}
        onCopyMermaid={handleCopyMermaid}
        onUndo={undo}
        onRedo={redo}
        onExpandUpstream={() => handleExpandExplicit("upstream")}
        onExpandDownstream={() => handleExpandExplicit("downstream")}
        onSmartExpand={handleSmartExpand}
        zoomLevel={zoomLevel}
        orientation={orientation}
        canUndo={canUndo}
        canRedo={canRedo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        layout={layout}
        onLayoutChange={setLayout}
        isNodeSelected={!!selectedNode}
      />

      <div className="graph-shell">
        {viewMode === "graph" ? (
          <GraphCanvas
            ref={mermaidRef}
            loading={loading}
            error={error}
            isEmpty={!graphData || graphData.nodes.length === 0}
          />
        ) : (
          <div className="list-view-placeholder">
            {/* List view implementation can go here later */}
            <p style={{ padding: "40px", textAlign: "center", color: "#666" }}>
              List view is currently in development.
            </p>
          </div>
        )}

        <Legend />
        <StatusBar loading={loading} error={error} />
      </div>

      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onExpandUpstream={() => handleExpandExplicit("upstream")}
        onExpandDownstream={() => handleExpandExplicit("downstream")}
        onShowDetails={() => {
          // Re-trigger global selection to open drawer
          if (onSelect && selectedNode) {
            onSelect({
              type: selectedNode.type as any,
              id: selectedNode.id,
              jobId: selectedNode.type === "job" ? selectedNode.id : undefined,
              tableName:
                selectedNode.type === "table"
                  ? selectedNode.full_name || selectedNode.name
                  : undefined,
            });
          }
        }}
        onDelete={() => selectedNode && removeNode(selectedNode.id)}
      />
    </div>
  );
};

export default App;

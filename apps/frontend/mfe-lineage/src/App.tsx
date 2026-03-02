import React, { useState, useEffect, useCallback, useRef } from "react";
import { GitBranch } from "lucide-react";
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
import { ListView } from "./components/ListView/ListView";

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
    expandGroup,
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
    selectNode,
    dsl,
  } = useMermaidRenderer({
    graphData,
    orientation,
    onSelect,
    onSmartExpand: handleSmartExpand,
    onExpandGroup: expandGroup,
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
    console.log("[Lineage App] rootNode updated:", rootNode);
    if (!rootNode?.id) return;

    if (
      lastFetchedNode.current?.id !== rootNode.id ||
      lastFetchedNode.current?.type !== rootNode.type
    ) {
      console.log("[Lineage App] Fetching graph for:", rootNode.type, rootNode.id);
      const controller = new AbortController();
      fetchGraph(rootNode.type, rootNode.id, false, "both", true, controller.signal);
      lastFetchedNode.current = { type: rootNode.type, id: rootNode.id };
      return () => controller.abort();
    } else {
      console.log("[Lineage App] Skipping fetch, same as lastFetchedNode");
    }
  }, [rootNode, fetchGraph]);

  // Global Event Listeners (Logic Parity with graphControllerNew.js)
  useEffect(() => {
    const handleViewInGraph = (e: any) => {
      const { nodeId } = e.detail;
      if (!nodeId) return;

      const [type, id] = nodeId.includes(":") ? nodeId.split(":") : ["job", nodeId];
      fetchGraph(type, id, false, "both", true);
    };

    document.addEventListener("job-detail:view-in-graph", handleViewInGraph);
    document.addEventListener("table-detail:view-in-graph", handleViewInGraph);

    return () => {
      document.removeEventListener("job-detail:view-in-graph", handleViewInGraph);
      document.removeEventListener("table-detail:view-in-graph", handleViewInGraph);
    };
  }, [fetchGraph]);

  const handleReset = useCallback(() => {
    resetToInitial();
    // Use resetView to center at 100%
    setTimeout(resetView, 100);
  }, [resetToInitial, resetView]);

  // List Actions
  // Ref for List Actions
  const listActionRef = useRef<any>(null);

  const handleListReload = useCallback(() => {
    if (listActionRef.current) {
      listActionRef.current.reload();
    }
  }, []);

  const handleListExport = useCallback(() => {
    if (listActionRef.current) {
      listActionRef.current.exportCsv();
    }
  }, []);

  return (
    <div
      className={`lineage-container view-mode-${viewMode}`}
      data-view-mode={viewMode}
      style={{
        border: "2px solid transparent",
      }} /* Space for debug if needed, but keeping it clean for now */
    >
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
        // List Actions
        onListReload={handleListReload}
        onListExport={handleListExport}
      />

      <div className="graph-shell">
        <div className={`graph-view ${viewMode === "graph" ? "active" : ""}`}>
          {!rootNode && viewMode === "graph" ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Data Lineage</h2>
              <p className="text-gray-500 max-w-md">
                Search for a table or job to explore its upstream and downstream dependencies.
              </p>
            </div>
          ) : (
            <GraphCanvas
              ref={mermaidRef}
              loading={loading}
              error={error}
              isEmpty={!graphData || graphData.nodes.length === 0}
            />
          )}
        </div>

        <div className={`list-view ${viewMode === "list" ? "active" : ""}`}>
          <ListView
            graphData={graphData || { nodes: [], edges: [] }}
            selectedNode={selectedNode}
            defaultRootNode={rootNode}
            listActionRef={listActionRef}
            onSelectNode={(node) => {
              if (onSelect) {
                onSelect({
                  type: node.type as any,
                  id: node.id,
                  jobId: node.type === "job" ? node.id : undefined,
                  tableName: node.type === "table" ? node.full_name || node.name : undefined,
                });
              }
            }}
          />
        </div>

        <Legend />
        <StatusBar loading={loading} error={error} />
      </div>

      <ContextMenu
        state={viewMode === "graph" ? contextMenu : null}
        onClose={() => setContextMenu(null)}
        onExpandUpstream={() => handleExpandExplicit("upstream")}
        onExpandDownstream={() => handleExpandExplicit("downstream")}
        onShowDetails={() => {
          if (selectedNode) {
            selectNode(selectedNode, "showDetail");
          }
        }}
        onDelete={() => selectedNode && removeNode(selectedNode.id)}
      />
    </div>
  );
};

export default App;

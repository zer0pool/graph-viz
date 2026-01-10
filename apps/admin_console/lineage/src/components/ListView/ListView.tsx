import React from "react";
import { GraphNode, GraphState, Selection } from "../../types/graph";
import { FullLineageTree } from "./FullLineageTree";
import "./ListView.css";

interface ListViewProps {
  graphData: GraphState;
  selectedNode: GraphNode | null;
  defaultRootNode?: Selection | null;
  onSelectNode: (node: GraphNode) => void;
  // New: Pass Ref
  listActionRef?: any;
}

export const ListView: React.FC<ListViewProps> = ({
  graphData,
  selectedNode,
  defaultRootNode,
  onSelectNode,
  listActionRef,
}) => {
  // 1. Resolve the "Initial Search Root Table"
  const initialRootTable = React.useMemo(() => {
    if (!defaultRootNode) return null;

    const searchId = defaultRootNode.id || "";

    // Condition 1: Initially searched by Table
    if (defaultRootNode.type === "table") {
      const fromGraph = graphData.nodes.find(
        (n: GraphNode) => n.id === searchId || n.id === `table:${searchId}`
      );
      if (fromGraph) return fromGraph;

      return {
        id: searchId,
        type: "table",
        name: searchId,
        full_name: defaultRootNode.tableName || searchId,
      } as GraphNode;
    }

    // Condition 2: Initially searched by Job -> Use table it writes to
    if (defaultRootNode.type === "job") {
      const jobId = searchId.includes(":") ? searchId : `job:${searchId}`;
      const writeEdge = graphData.edges.find((e: any) => e.source === jobId);
      if (writeEdge) {
        const targetNode = graphData.nodes.find(
          (n: GraphNode) => n.id === writeEdge.target && n.type === "table"
        );
        if (targetNode) return targetNode;
      }

      // Fallback: If no direct write edge found yet, maybe any connected table
      const anyEdge = graphData.edges.find(
        (e: any) => e.source === jobId || e.target === jobId
      );
      if (anyEdge) {
        const otherId =
          anyEdge.source === jobId ? anyEdge.target : anyEdge.source;
        const targetNode = graphData.nodes.find(
          (n: GraphNode) => n.id === otherId && n.type === "table"
        );
        if (targetNode) return targetNode;
      }
    }

    return null;
  }, [defaultRootNode, graphData]);

  // 2. Final rootNode decision for the List View
  // - If a Table is explicitly selected -> Use it.
  // - If a Job is selected, or nothing is selected -> Fallback to Initial Search Root Table.
  const rootNode =
    selectedNode?.type === "table" ? selectedNode : initialRootTable;

  return (
    <div className="list-view-container">
      {/* Tabs removed as per user request to always show Full Lineage */}
      {/* <div className="list-tabs">...</div> */}

      <div className="list-content">
        <FullLineageTree
          rootNode={rootNode}
          selectedNodeId={selectedNode?.id} // Highlight selected if it matches
          onSelectNode={onSelectNode}
          actionRef={listActionRef}
        />
      </div>
    </div>
  );
};

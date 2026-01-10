import React from "react";
import { GraphNode } from "../../types/graph";

interface CurrentNodeListProps {
  nodes: GraphNode[];
  selectedNodeId?: string;
  onSelect: (node: GraphNode) => void;
}

export const CurrentNodeList: React.FC<CurrentNodeListProps> = ({
  nodes,
  selectedNodeId,
  onSelect,
}) => {
  if (nodes.length === 0) {
    return <div className="list-empty">No nodes to display</div>;
  }

  return (
    <div className="current-node-list">
      <table className="list-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Platform</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr
              key={node.id}
              className={node.id === selectedNodeId ? "selected" : ""}
              onClick={() => onSelect(node)}
            >
              <td>{node.label || node.name || node.id}</td>
              <td>{node.type}</td>
              <td>{node.platform || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

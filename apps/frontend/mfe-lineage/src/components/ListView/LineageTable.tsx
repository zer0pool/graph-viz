import React, { useState } from "react";
import { LineageItem, LineageTreeUtils } from "../../utils/LineageTreeUtils";
import { config } from "../../config";
import { UpstreamIcon, DownstreamIcon } from "../../assets/icons";
import "./ListView.css";

interface LineageTableProps {
  title: string;
  items: LineageItem[];
  selectedNodeId?: string;
  onSelectNode: (node: LineageItem) => void;
  isLoadingMeta?: boolean;
  onExpandMore?: (parentId: string) => void;
  jobTooltip?: string;
  iconType?: "upstream" | "downstream";
}

const cleanId = (id: string) => {
  if (id.startsWith("table:")) return id.substring(6);
  if (id.startsWith("job:")) return id.substring(4);
  return id;
};

export const LineageTable: React.FC<LineageTableProps> = ({
  title,
  items,
  selectedNodeId,
  onSelectNode,
  isLoadingMeta = false,
  onExpandMore,
  jobTooltip,
  iconType,
}) => {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  if (!items || items.length === 0) return null;

  const limit = config.PROGRESSIVE_LOADING_LIMIT;
  const flatList = LineageTreeUtils.buildFlatTree(items, expandedGroupIds, limit);
  const counts = LineageTreeUtils.getCounts(items);

  const handleExpand = (parentId: string) => {
    if (onExpandMore) {
      onExpandMore(parentId);
    }
    const next = new Set(expandedGroupIds);
    next.add(parentId);
    setExpandedGroupIds(next);
  };

  // Render tree prefix visually
  const renderPrefix = (prefix?: string) => {
    if (!prefix) return null;
    const items = [];
    for (let i = 0; i < prefix.length; i += 2) {
      const chunk = prefix.substring(i, i + 2);
      let className = "tree-line-cell";
      if (chunk.startsWith("│")) className += " tree-line-v";
      else if (chunk.startsWith("├")) className += " tree-line-t";
      else if (chunk.startsWith("└")) className += " tree-line-l";
      items.push(<span key={i} className={className}></span>);
    }
    return <div className="tree-line-container">{items}</div>;
  };

  return (
    <div className="lineage-card">
      <div className="lineage-card-header">
        {iconType && (
          <span className="lineage-card-icon">
            {iconType === "upstream" ? <UpstreamIcon /> : <DownstreamIcon />}
          </span>
        )}
        <span className="apa-table-label">{title}</span>
      </div>
      <div className="lineage-card-body">
        <table className="apa-table">
          <thead>
            <tr className="apa-header-group">
              <th colSpan={2} className="group-identity">
                Identity
              </th>
              <th colSpan={2} className="group-table">
                Table Section
              </th>
              <th colSpan={5} className="group-job">
                Job Section
              </th>
            </tr>
            <tr className="apa-header-detail">
              <th style={{ width: 250 }}>Table Name</th>
              <th style={{ width: 50, textAlign: "center" }}>Depth</th>
              <th style={{ width: 100 }}>Storage</th>
              <th style={{ width: 100 }}>Write Mode</th>
              <th style={{ width: 150 }}>
                Job ID
                {jobTooltip && (
                  <span
                    className="help-icon"
                    title={jobTooltip}
                    style={{
                      marginLeft: "6px",
                      cursor: "help",
                      fontSize: "14px",
                      color: "#5f6368",
                      display: "inline-flex",
                      alignItems: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    ⓘ
                  </span>
                )}
              </th>
              <th style={{ width: 100 }}>Owner</th>
              <th style={{ width: 150 }}>Schedule</th>
              <th style={{ width: 150 }}>Status</th>
              <th style={{ width: 100 }}>Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            {flatList.map((item) => {
              if (item.type === "MORE") {
                return (
                  <tr
                    key={item.id}
                    className="row-more"
                    onClick={() =>
                      item.properties?.parentId && handleExpand(item.properties.parentId)
                    }
                  >
                    <td colSpan={9}>
                      <div className="node-label-container">
                        {renderPrefix(item.treePrefix)}
                        <span className="more-label">{item.name}</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const isSelected = item.id === selectedNodeId;
              const props = item.properties || {};
              const job = item.viaJob;
              const jobProps = job?.properties || {};

              const itemLoading = isLoadingMeta && item.type !== "MORE";

              return (
                <tr
                  key={item.id}
                  className={`${isSelected ? "selected" : ""} ${
                    item.depth === 0 ? "depth-root-row" : ""
                  }`}
                  onClick={() => onSelectNode(item)}
                >
                  <td className="col-identity">
                    <div className="node-label-container">
                      {renderPrefix(item.treePrefix)}
                      {item.depth === 0 ? (
                        <span className="root-table-badge">{cleanId(item.id)}</span>
                      ) : (
                        <span className="node-label-text">{cleanId(item.id)}</span>
                      )}
                    </div>
                  </td>
                  <td className="col-identity" style={{ textAlign: "center" }}>
                    {Math.floor(item.depth / 2)}
                  </td>
                  <td className="col-table">{props.storage || "-"}</td>
                  <td className="col-table">{props.write_mode || "-"}</td>
                  <td className="col-job">
                    {itemLoading ? <div className="skeleton-box" /> : job ? cleanId(job.name) : "-"}
                  </td>
                  <td className="col-job">
                    {itemLoading ? <div className="skeleton-box" /> : jobProps.owner || "-"}
                  </td>
                  <td className="col-job">
                    {itemLoading ? <div className="skeleton-box" /> : jobProps.schedule || "-"}
                  </td>
                  <td className="col-job">
                    {itemLoading ? (
                      <div className="skeleton-pill" />
                    ) : jobProps.status ? (
                      <span className={`status-pill status-${jobProps.status.toLowerCase()}`}>
                        {jobProps.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="col-job">
                    {itemLoading ? <div className="skeleton-box" /> : props.lifecycle || "-"}
                  </td>
                </tr>
              );
            })}
            <tr className="apa-total-row">
              <td colSpan={9} style={{ textAlign: "right" }}>
                Total — Tables: {counts.t} • Jobs: {counts.j}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

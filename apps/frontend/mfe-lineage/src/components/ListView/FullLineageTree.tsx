import React, { useEffect, useState, useImperativeHandle } from "react";
import { GitBranch, Table2, Loader2, Database } from "lucide-react";
import { GraphApiService } from "../../services/GraphApiService";
import { GraphNode } from "../../types/graph";
import { LineageTable } from "./LineageTable";
import { LineageItem, LineageTreeUtils } from "../../utils/LineageTreeUtils";
import { ExportUtils } from "../../utils/ExportUtils";
import "./ListView.css";

export interface ListActions {
  reload: () => void;
  exportCsv: () => void;
  isLocalSelected: boolean; // To change button text
}

interface FullLineageTreeProps {
  rootNode: GraphNode | null;
  onSelectNode: (node: GraphNode) => void;
  selectedNodeId?: string;
  actionRef?: React.MutableRefObject<ListActions | null>;
}

const cleanId = (id: string) => {
  if (id.startsWith("table:")) return id.substring(6);
  if (id.startsWith("job:")) return id.substring(4);
  return id;
};

export const FullLineageTree: React.FC<FullLineageTreeProps> = ({
  rootNode,
  onSelectNode,
  selectedNodeId,
  actionRef,
}) => {
  // Effective root node to display lineage for.
  const [effectiveRoot, setEffectiveRoot] = useState<GraphNode | null>(rootNode);

  // Local selection state for "Select Row" feature
  const [localSelectedNode, setLocalSelectedNode] = useState<LineageItem | null>(null);

  const [data, setData] = useState<{
    upstream: LineageItem[];
    downstream: LineageItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (rootNode) {
      setEffectiveRoot(rootNode);
      setLocalSelectedNode(null);
    }
  }, [rootNode]);

  const fetchMetadata = async (nodes: LineageItem[]) => {
    if (!nodes.length) return;
    setIsLoadingMeta(true);
    try {
      const nodeIds = Array.from(new Set(nodes.map((n) => n.id)));
      const detailsResponse = await GraphApiService.fetchBatchDetails(nodeIds);
      const detailsMap = detailsResponse.results || {};

      setData((prev) => {
        if (!prev) return null;

        const enrich = (list: LineageItem[]): LineageItem[] =>
          list.map((item) => {
            const detail = detailsMap[item.id];
            let newItem: LineageItem = { ...item, depth: item.depth ?? 0 };
            if (detail) {
              const properties = {
                ...(item.properties || {}),
                ...(detail.table_info || {}),
                ...(detail.job_info || {}),
                storage: detail.table_info?.storage_type || detail.table_info?.storage || "-",
                write_mode: detail.table_info?.write_mode || "-",
                owner: detail.job_info?.owner || "-",
                status: detail.job_info?.status || detail.job_info?.run_status || "-",
                schedule:
                  detail.job_info?.cron ||
                  detail.job_info?.schedule ||
                  detail.job_info?.cron_expression ||
                  "-",
                lifecycle: detail.job_info?.lifecycle_status || "-",
              };

              let viaJob = item.viaJob;
              if (detail.job_info && detail.job_info.job_id !== "-") {
                viaJob = {
                  ...(viaJob || {}),
                  id: detail.job_info.job_id,
                  name: detail.job_info.job_id,
                  type: "job",
                  depth: item.depth ?? 0,
                  properties: {
                    ...(viaJob?.properties || {}),
                    ...properties,
                  },
                };
              }
              newItem = { ...item, properties, viaJob };
            }

            if (newItem.children) {
              newItem.children = enrich(newItem.children);
            }
            return newItem;
          });

        return {
          upstream: enrich(prev.upstream),
          downstream: enrich(prev.downstream),
        };
      });
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (!effectiveRoot) return;
    if (effectiveRoot.type !== "table") return;

    const fetchHierarchy = async () => {
      setLoading(true);
      setError(null);
      try {
        const tableName = effectiveRoot.full_name || effectiveRoot.name || effectiveRoot.id;
        const result = await GraphApiService.fetchTableHierarchy(tableName);
        const hierarchyData = result.tree || result;

        setData({
          upstream: hierarchyData.upstream || [],
          downstream: hierarchyData.downstream || [],
        });
        setLoading(false); // Hierarchy is ready, show the table

        // Now fetch metadata asynchronously
        const initialNodes: LineageItem[] = [
          ...(hierarchyData.upstream || []),
          ...(hierarchyData.downstream || []),
        ];
        fetchMetadata(initialNodes);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [effectiveRoot, refreshKey]);

  const handleExpandMore = (parentId: string) => {
    if (!data) return;
    // The nodes are already in 'data' (loaded by fetchTableHierarchy).
    // We just need to fetch their metadata if it hasn't been fetched.
    // LineageTable handles the visual expansion via local state.
    // Here we find which nodes will be revealed and fetch their details.

    // For simplicity, we can fetch metadata for all children of parentId
    const findNode = (list: LineageItem[]): LineageItem | null => {
      for (const node of list) {
        if (node.id === parentId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const parent = findNode(data.upstream) || findNode(data.downstream);
    if (parent && parent.children) {
      fetchMetadata(parent.children);
    }
  };

  // Actions
  const handleReload = () => {
    if (localSelectedNode) {
      const newRoot: GraphNode = {
        id: localSelectedNode.id,
        type: localSelectedNode.type,
        name: localSelectedNode.name || localSelectedNode.id,
        full_name: localSelectedNode.id,
      };
      setEffectiveRoot(newRoot);
      setLocalSelectedNode(null);
    } else {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const handleExport = () => {
    if (!data || !effectiveRoot) return;
    ExportUtils.exportToExcel(
      {
        upstream: data.upstream,
        downstream: data.downstream,
      },
      effectiveRoot.id
    );
  };

  // Expose methods to parent
  useImperativeHandle(
    actionRef,
    () => ({
      reload: handleReload,
      exportCsv: handleExport,
      isLocalSelected: !!localSelectedNode,
    }),
    [handleReload, handleExport, localSelectedNode] // Deps necessary for correct closure? Actually handleReload/Export depend on state, so yes.
  );

  if (!effectiveRoot) {
    return <div className="list-empty">Select a table to view full lineage</div>;
  }

  if (effectiveRoot.type !== "table") {
    return (
      <div className="list-empty">
        Full lineage is only available for tables (Selected: {effectiveRoot.type})
      </div>
    );
  }

  const handleRowClick = (item: LineageItem) => {
    setLocalSelectedNode(item);
    const graphNode: GraphNode = {
      id: item.id,
      type: item.type,
      name: item.name || item.id,
      full_name: item.id,
    };
    onSelectNode(graphNode);
  };

  if (loading) {
    return (
      <div className="impact-loading-container">
        <Loader2 className="impact-spinner" size={48} />
      </div>
    );
  }
  if (error) return <div className="list-error">Error: {error}</div>;
  if (!data) return <div className="list-empty">No hierarchy data found</div>;

  return (
    <div className="full-lineage-container">
      <div className="impact-analysis-header">
        <div className="impact-header-top">
          <div className="impact-title-group">
            <h1 className="impact-main-title">Provenance & Impact Analysis</h1>
          </div>
        </div>

        <div className="impact-summary-grid">
          <div className="impact-summary-card target-table">
            <div className="card-icon-wrapper">
              <Database size={20} className="text-slate-600" />
            </div>
            <div className="card-info">
              <span className="card-label">Target Table</span>
              <span className="card-value-small">{cleanId(effectiveRoot.id)}</span>
            </div>
          </div>

          <div className="impact-summary-card upstream">
            <div className="card-icon-wrapper">
              <GitBranch size={20} className="text-indigo-600" />
            </div>
            <div className="card-info">
              <span className="card-label">Upstream Tables</span>
              <span className="card-value">
                {LineageTreeUtils.getCounts(data?.upstream || []).t}
              </span>
            </div>
          </div>

          <div className="impact-summary-card downstream">
            <div className="card-icon-wrapper">
              <Table2 size={20} className="text-blue-600" />
            </div>
            <div className="card-info">
              <span className="card-label">Downstream Tables</span>
              <span className="card-value">
                {LineageTreeUtils.getCounts(data?.downstream || []).t}
              </span>
            </div>
          </div>
        </div>
      </div>

      <LineageTable
        title="Upstream"
        items={data.upstream}
        selectedNodeId={localSelectedNode?.id || selectedNodeId}
        onSelectNode={handleRowClick}
        isLoadingMeta={isLoadingMeta}
        onExpandMore={handleExpandMore}
        jobTooltip="Job that reads data from the table"
        iconType="upstream"
      />

      <LineageTable
        title="Downstream"
        items={data.downstream}
        selectedNodeId={localSelectedNode?.id || selectedNodeId}
        onSelectNode={handleRowClick}
        isLoadingMeta={isLoadingMeta}
        onExpandMore={handleExpandMore}
        jobTooltip="Job that writes data to the table"
        iconType="downstream"
      />
    </div>
  );
};

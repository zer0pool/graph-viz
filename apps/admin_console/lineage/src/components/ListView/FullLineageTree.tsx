import React, { useEffect, useState, useImperativeHandle } from "react";
import { GraphApiService } from "../../services/GraphApiService";
import { GraphNode } from "../../types/graph";
import { LineageTable } from "./LineageTable";
import { LineageItem } from "../../utils/LineageTreeUtils";
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

export const FullLineageTree: React.FC<FullLineageTreeProps> = ({
  rootNode,
  onSelectNode,
  selectedNodeId,
  actionRef,
}) => {
  // Effective root node to display lineage for.
  const [effectiveRoot, setEffectiveRoot] = useState<GraphNode | null>(
    rootNode,
  );

  // Local selection state for "Select Row" feature
  const [localSelectedNode, setLocalSelectedNode] =
    useState<LineageItem | null>(null);

  const [data, setData] = useState<{
    upstream: LineageItem[];
    downstream: LineageItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (rootNode) {
      setEffectiveRoot(rootNode);
      setLocalSelectedNode(null);
    }
  }, [rootNode]);

  useEffect(() => {
    if (!effectiveRoot) return;
    if (effectiveRoot.type !== "table") return;

    const fetchHierarchy = async () => {
      setLoading(true);
      setError(null);
      try {
        const tableName =
          effectiveRoot.full_name || effectiveRoot.name || effectiveRoot.id;
        const result = await GraphApiService.fetchTableHierarchy(tableName);
        const hierarchyData = result.tree || result;

        // --- NEW: Batch Metadata Enrichment ---
        const allNodes: any[] = [
          ...(hierarchyData.upstream || []),
          ...(hierarchyData.downstream || []),
        ];

        // 1. Collect all unique IDs
        const nodeIds = Array.from(new Set(allNodes.map((n: any) => n.id)));

        // 2. Fetch batch details
        const detailsResponse =
          await GraphApiService.fetchBatchDetails(nodeIds);
        const detailsMap = detailsResponse.results || {};

        // 3. Helper to merge details into a node
        const enrichNode = (item: any) => {
          const detail = detailsMap[item.id];
          if (!detail) {
            console.warn(`[Lineage] No detail found for node: ${item.id}`);
            return { ...item };
          }

          // Merge BOTH table and job info into properties
          const properties = {
            ...(item.properties || {}),
            ...(detail.table_info || {}),
            ...(detail.job_info || {}),
            // Explicit mappings for LineageTable columns
            storage:
              detail.table_info?.storage_type ||
              detail.table_info?.storage ||
              "-",
            write_mode: detail.table_info?.write_mode || "-",
            owner: detail.job_info?.owner || "-",
            status:
              detail.job_info?.status || detail.job_info?.run_status || "-",
            schedule:
              detail.job_info?.cron ||
              detail.job_info?.schedule ||
              detail.job_info?.cron_expression ||
              "-",
            lifecycle: detail.job_info?.lifecycle_status || "-",
          };

          // Also enrich viaJob if it exists (for table rows that reference a job)
          let viaJob = item.viaJob;
          if (detail.job_info && detail.job_info.job_id !== "-") {
            viaJob = {
              ...(viaJob || {}),
              id: detail.job_info.job_id,
              name: detail.job_info.job_id,
              properties: {
                ...(viaJob?.properties || {}),
                ...properties, // Use the same enriched properties
              },
            };
          }

          return { ...item, properties, viaJob };
        };

        // 4. Enrich all items
        const enrichedUpstream = (hierarchyData.upstream || []).map(enrichNode);
        const enrichedDownstream = (hierarchyData.downstream || []).map(
          enrichNode,
        );

        setData({
          upstream: enrichedUpstream,
          downstream: enrichedDownstream,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [effectiveRoot, refreshKey]);

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
      effectiveRoot.id,
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
    [handleReload, handleExport, localSelectedNode], // Deps necessary for correct closure? Actually handleReload/Export depend on state, so yes.
  );

  if (!effectiveRoot) {
    return (
      <div className="list-empty">Select a table to view full lineage</div>
    );
  }

  if (effectiveRoot.type !== "table") {
    return (
      <div className="list-empty">
        Full lineage is only available for tables (Selected:{" "}
        {effectiveRoot.type})
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

  if (loading) return <div className="list-loading">Loading hierarchy...</div>;
  if (error) return <div className="list-error">Error: {error}</div>;
  if (!data) return <div className="list-empty">No hierarchy data found</div>;

  return (
    <div className="full-lineage-container">
      <div className="full-lineage-header">
        <h3>
          Full Lineage —{" "}
          <span className="root-node-name">{effectiveRoot.id}</span>
        </h3>
      </div>

      <LineageTable
        title="Upstream"
        items={data.upstream || []}
        selectedNodeId={localSelectedNode?.id || selectedNodeId}
        onSelectNode={handleRowClick}
      />

      <LineageTable
        title="Downstream"
        items={data.downstream || []}
        selectedNodeId={localSelectedNode?.id || selectedNodeId}
        onSelectNode={handleRowClick}
      />
    </div>
  );
};

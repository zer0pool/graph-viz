import React, { useState } from "react";
import { ViewMode } from "../../types";
import { DetailLayout, Tab } from "../../components/DetailLayout";
import { useTableOverview } from "../../hooks/useTableOverview";
import { useTableSchema } from "../../hooks/useTableSchema";
import { useTableTimeliness } from "../../hooks/useTableTimeliness";
import { TableOverview } from "../../components/table/TableOverview";
import { TableSchema } from "../../components/table/TableSchema";
import { TableTimeliness } from "../../components/table/TableTimeliness";
import { MermaidGraph } from "../../components/MermaidGraph";

const TABLE_TABS: Tab[] = [
  { id: "info", label: "Table Info" },
  { id: "schema", label: "Schema" },
  { id: "lineage", label: "Lineage" },
  { id: "timeliness", label: "Timeliness" },
];

export const TableDetailView: React.FC<{
  tableName: string;
  mode?: ViewMode;
}> = ({ tableName, mode = "EMBEDDED" }) => {
  const [tab, setTab] = useState("info");

  // Hooks
  const { table, loading: loadingInfo } = useTableOverview(tableName);
  const { schema, loading: loadingSchema } = useTableSchema(tableName);
  const { timeliness, loading: loadingTime } = useTableTimeliness(tableName);

  // Mock Lineage Chart for now
  const lineageChart = `
    graph TD
    A[Source] --> B(${tableName})
    B --> C[Downstream]
  `;

  return (
    <DetailLayout
      title={`Table: ${table?.name || tableName}`}
      tabs={TABLE_TABS}
      activeTab={tab}
      onTabChange={setTab}
      mode={mode}
    >
      {tab === "info" && (
        <TableOverview
          table={table || ({ id: tableName, name: tableName } as any)}
          loading={loadingInfo}
        />
      )}
      {tab === "schema" && (
        <TableSchema columns={schema?.columns || []} loading={loadingSchema} />
      )}
      {tab === "lineage" && (
        <div className="h-full">
          <h4 className="text-lg font-medium mb-4">Lineage Graph</h4>
          <MermaidGraph chart={lineageChart} loading={false} />
        </div>
      )}
      {tab === "timeliness" && (
        <TableTimeliness
          history={timeliness?.history || []}
          loading={loadingTime}
        />
      )}
    </DetailLayout>
  );
};

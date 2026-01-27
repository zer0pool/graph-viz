import React, { useState } from "react";
import { ViewMode } from "../../types";
import { DetailLayout, Tab } from "../../components/DetailLayout";
import { useTableOverview } from "../../hooks/useTableOverview";
import { useTableSchema } from "../../hooks/useTableSchema";
import { useTableTimeliness } from "../../hooks/useTableTimeliness";
import { useTableLineage } from "../../hooks/useTableLineage";
import { TableOverview } from "../../components/table/TableOverview";
import { TableSchema } from "../../components/table/TableSchema";
import { TableTimeliness } from "../../components/table/TableTimeliness";
import { TableLineage } from "../../components/table/TableLineage";

const TABLE_TABS: Tab[] = [
  { id: "info", label: "Overview" },
  { id: "lineage", label: "Lineage" },
  { id: "schema", label: "Schema" },
  { id: "timeliness", label: "Timeliness" },
];

export const TableDetailView: React.FC<{
  tableName: string;
  mode?: ViewMode;
}> = ({ tableName, mode = "EMBEDDED" }) => {
  const [tab, setTab] = useState("info");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["info"]));

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setLoadedTabs((prev) => new Set(prev).add(newTab));
  };

  // Hooks
  const { table, loading: loadingInfo } = useTableOverview(tableName);

  const { schema, loading: loadingSchema } = useTableSchema(
    loadedTabs.has("schema") ? tableName : ""
  );

  const { timeliness, loading: loadingTime } = useTableTimeliness(
    loadedTabs.has("timeliness") ? tableName : ""
  );

  // Lineage is needed for metrics in Overview and for the Lineage tab itself
  const { lineage, loading: loadingLineage } = useTableLineage(
    (loadedTabs.has("lineage") || tab === "info") ? tableName : ""
  );

  return (
    <DetailLayout
      title={table?.name || tableName.split('.').pop() || tableName}
      tabs={TABLE_TABS}
      activeTab={tab}
      onTabChange={handleTabChange}
      mode={mode}
      owner={table?.owner}
    >
      <div className="h-full overflow-y-auto p-6">
        {tab === "info" && (
          <TableOverview
            table={table || ({ id: tableName, name: tableName } as any)}
            loading={loadingInfo}
            writerCount={lineage?.metrics.upstream_job_count}
            readerCount={lineage?.metrics.downstream_job_count}
          />
        )}
        {tab === "lineage" && (
          <TableLineage 
            lineage={lineage} 
            loading={loadingLineage} 
            tableName={tableName}
          />
        )}
        {tab === "schema" && (
          <TableSchema
            columns={schema?.columns || []}
            loading={loadingSchema}
          />
        )}
        {tab === "timeliness" && (
          <TableTimeliness
            data={timeliness}
            loading={loadingTime}
            tableName={tableName}
          />
        )}
      </div>
    </DetailLayout>
  );
};

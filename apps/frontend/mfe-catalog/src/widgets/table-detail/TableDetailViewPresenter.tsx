import React from "react";
import { ViewMode } from "../../shared/types";
import { DetailLayout, Tab } from "../../shared/ui/DetailLayout";
import { CompactDetailLayout } from "../../shared/ui/CompactDetailLayout";
import { TableOverview } from "../../entities/table/TableOverview";
import { TableSchema } from "../../entities/table/TableSchema";
import { TableTimeliness } from "../../entities/table/TableTimeliness";
import { TableLineage } from "../../entities/table/TableLineage";

const TABLE_TABS: Tab[] = [
  { id: "info", label: "Overview" },
  { id: "lineage", label: "Lineage" },
  { id: "schema", label: "Schema" },
  { id: "timeliness", label: "Timeliness" },
];

interface TableDetailViewPresenterProps {
  tableName: string;
  mode: ViewMode;
  tab: string;
  onTabChange: (tab: string) => void;
  table: any;
  loadingInfo: boolean;
  lineage: any;
  loadingLineage: boolean;
  schema: any;
  loadingSchema: boolean;
  timeliness: any;
  loadingTime: boolean;
  timelineDays: number;
  onTimelineDaysChange: (days: number) => void;
  projectName: string;
  datasetName: string;
  displayName: string;
}

import {
  GitBranch,
  Database,
  Folder,
  FileCode,
  Search,
  Server,
  Star,
  RefreshCcw,
} from "lucide-react";
import { EntityHeader } from "../../shared/ui/EntityHeader";
import { HeaderActionButtons } from "../../shared/ui/HeaderActionButtons";

export const TableDetailViewPresenter: React.FC<TableDetailViewPresenterProps> = ({
  tableName,
  mode,
  tab,
  onTabChange,
  table,
  loadingInfo,
  lineage,
  loadingLineage,
  schema,
  loadingSchema,
  timeliness,
  loadingTime,
  timelineDays,
  onTimelineDaysChange,
  projectName,
  datasetName,
  displayName,
}) => {
  const Layout = mode === "EMBEDDED" ? CompactDetailLayout : (DetailLayout as any);

  // 1. Determine Storage Type and Icon
  const storageType = (table?.storage_info?.type || "table").toLowerCase();
  const isCloudStorage =
    storageType.includes("s3") || storageType.includes("gcs") || storageType.includes("file");

  const HeaderIcon = isCloudStorage ? Folder : Database;
  const iconBgColor = isCloudStorage
    ? "bg-amber-50 text-amber-600 border-amber-100"
    : "bg-blue-50 text-blue-600 border-blue-100";

  // 2. Permanent Header Actions
  const headerActions = (
    <HeaderActionButtons
      onSync={() => console.log("Sync clicked")}
      onLineage={() =>
        window.dispatchEvent(
          new CustomEvent("mfe:navigate", {
            detail: { path: `/lineage/table:${encodeURIComponent(tableName)}` },
          })
        )
      }
    />
  );

  // 3. Rich Header Content
  const metadata = [
    { icon: Server, label: projectName },
    { icon: Search, label: datasetName },
  ];

  const tableHeaderSummary = (
    <EntityHeader
      icon={HeaderIcon}
      iconClassName={iconBgColor}
      title={displayName}
      badge={table?.storage_info?.type}
      metadata={metadata}
      actions={headerActions}
      onFavoriteToggle={() => console.log("Table favorite clicked")}
    />
  );

  return (
    <Layout
      title={displayName}
      tabs={TABLE_TABS}
      activeTab={tab}
      onTabChange={onTabChange}
      mode={mode}
      type="table"
      headerContent={tableHeaderSummary}
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
          <TableLineage lineage={lineage} loading={loadingLineage} tableName={tableName} />
        )}
        {tab === "schema" && (
          <TableSchema columns={schema?.columns || []} loading={loadingSchema} />
        )}
        {tab === "timeline" && (
          <TableTimeliness
            data={timeliness}
            loading={loadingTime}
            tableName={tableName}
            days={timelineDays}
            onDaysChange={onTimelineDaysChange}
          />
        )}
      </div>
    </Layout>
  );
};

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
}

import { GitBranch } from "lucide-react";

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
}) => {
  const Layout = mode === "EMBEDDED" ? CompactDetailLayout : DetailLayout;

  const headerActions = tab === 'lineage' ? (
    <button 
      onClick={() => window.dispatchEvent(new CustomEvent('mfe:navigate', { 
        detail: { path: `/lineage/table:${encodeURIComponent(tableName)}` } 
      }))}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded shadow-sm transition-all shadow-[#3c404326]"
    >
      <GitBranch className="w-3.5 h-3.5" />
      See lineage graph
    </button>
  ) : null;

  return (
    <Layout
      title={table?.name || tableName.split('.').pop() || tableName}
      tabs={TABLE_TABS}
      activeTab={tab}
      onTabChange={onTabChange}
      mode={mode}
      owner={table?.owner}
      type="table"
      actions={headerActions}
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
            days={timelineDays}
            onDaysChange={onTimelineDaysChange}
          />
        )}
      </div>
    </Layout>
  );
};

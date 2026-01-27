import React from "react";
import { SummaryGrid } from "../../components/common/SummaryGrid";
import { RefreshCw } from "lucide-react";

export const DashboardLanding: React.FC = () => {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm text-gray-500">
            Platform-wide data asset and pipeline insights
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryGrid 
        cols={5}
        metrics={[
          { type: "total_tables", value: 1240, subtext: "Across all schemas" },
          { type: "total_jobs", value: 856, subtext: "Active pipelines" },
          { type: "dummy_chart", value: "85%", subtext: "System Health" },
          { type: "dummy_chart", value: 12, subtext: "Active Alerts", status: "warning" },
          { type: "dummy_chart", value: "2.4 TB", subtext: "Daily Ingestion" },
        ]}
      />

      {/* Main Content Areas (Placeholders for now) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
          Ingestion Trends Chart
        </div>
        <div className="h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
          Top 10 Tables by Size
        </div>
      </div>
    </div>
  );
};

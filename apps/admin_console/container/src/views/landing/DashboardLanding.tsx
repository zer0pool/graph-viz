import React from "react";
import { SummaryGrid } from "../../components/common/SummaryGrid";
import { RefreshCw, MapPin, Clock } from "lucide-react";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import { VisitHistoryCard } from "../../components/common/VisitHistoryCard";

export const DashboardLanding: React.FC = () => {
  // 🟢 View is now clean: Logic is encapsulated in the hook
  const { recentHistory, topVisited, loadingTop, refresh } = useAnalyticsData();

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm text-gray-500">
            Platform-wide data asset and pipeline insights
          </p>
        </div>
        <button
          onClick={() => {
            refresh(); // Refresh data without reloading page
            window.location.reload(); // Optional: Reload page if needed for other components
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Section */}
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

      {/* History & Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Functional Component 1: Top Visited (Remote Data) */}
        <VisitHistoryCard
          title="Top Visited"
          subtitle="Last 4 hours"
          icon={MapPin}
          iconColor="text-blue-500"
          items={topVisited}
          loading={loadingTop}
          emptyMessage="No global visit data available"
          onViewMore={() => console.log("View more top visited")}
        />

        {/* Functional Component 2: Recently Visited (Local Data) */}
        <VisitHistoryCard
          title="Recently Visited"
          icon={Clock}
          iconColor="text-orange-500"
          items={recentHistory}
          emptyMessage="No recent personal history"
          onViewMore={() => console.log("View more recent")}
        />
      </div>

      {/* Analytical Charts Section (Placeholders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
          Ingestion Trends Chart Content
        </div>
        <div className="h-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
          Resource Capacity Analysis Content
        </div>
      </div>
    </div>
  );
};

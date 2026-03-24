import React from "react";
import { SummaryGrid } from "../../shared/ui/SummaryGrid";
import { RefreshCw, MapPin, Clock } from "lucide-react";
import { useAnalyticsData } from "../../shared/lib/hooks/useAnalyticsData";
import { useLandingPageData } from "../../shared/lib/hooks/useLandingPageData";
import { useJobDepartmentData } from "../../shared/lib/hooks/useJobDepartmentData";
import { VisitHistoryCard } from "../../shared/ui/VisitHistoryCard";
import { DepartmentHeatmapCard } from "../../shared/ui/DepartmentHeatmapCard";
import { formatWindowHours } from "../../shared/lib/utils";

export function DashboardPage() {
  const {
    recentHistory,
    topVisited,
    windowHours,
    loadingTop,
    refresh: refreshAnalytics,
  } = useAnalyticsData();
  const { metrics, refresh: refreshLanding } = useLandingPageData("overview");
  const {
    items: deptItems,
    total: deptTotal,
    loading: deptLoading,
    refresh: refreshDept,
  } = useJobDepartmentData();

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm text-gray-500">
            Data-Scheduling data asset and pipeline insights
          </p>
        </div>
        <button
          onClick={() => {
            refreshAnalytics();
            refreshLanding();
            refreshDept();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Section */}
      <SummaryGrid cols={5} metrics={metrics} />

      {/* History & Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisitHistoryCard
          title="Top Visited"
          subtitle={`Last ${formatWindowHours(windowHours)}`}
          icon={MapPin}
          iconColor="text-blue-500"
          items={topVisited}
          loading={loadingTop}
          emptyMessage="No global visit data available"
          onViewMore={() => console.log("View more top visited")}
        />
        <VisitHistoryCard
          title="Recently Visited"
          icon={Clock}
          iconColor="text-orange-500"
          items={recentHistory}
          emptyMessage="No recent personal history"
          onViewMore={() => console.log("View more recent")}
        />
      </div>

      {/* Department Heatmap Section */}
      <div className="grid grid-cols-2 gap-6">
        <DepartmentHeatmapCard items={deptItems} total={deptTotal} loading={deptLoading} />
      </div>
    </div>
  );
}

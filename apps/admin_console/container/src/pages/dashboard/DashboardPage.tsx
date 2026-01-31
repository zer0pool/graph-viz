import React from "react";
import { SummaryGrid } from '../../shared/ui/SummaryGrid';
import { RefreshCw, MapPin, Clock } from "lucide-react";
import { useAnalyticsData } from "../../shared/lib/hooks/useAnalyticsData";
import { useDashboardMetrics } from "../../shared/lib/hooks/useDashboardMetrics";
import { VisitHistoryCard } from '../../shared/ui/VisitHistoryCard';

export function DashboardPage() {
  // 🟢 View is now clean: Logic is encapsulated in the hook
  const { recentHistory, topVisited, loadingTop, refresh } = useAnalyticsData();
  const { metrics, loading: loadingMetrics, refresh: refreshMetrics } = useDashboardMetrics();

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
            refresh(); // Refresh analytics data
            refreshMetrics(); // Refresh metrics data
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
        metrics={metrics}
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

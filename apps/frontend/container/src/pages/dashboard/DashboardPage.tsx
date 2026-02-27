import React from "react";
import { SummaryGrid } from '../../shared/ui/SummaryGrid';
import { RefreshCw, MapPin, Clock } from "lucide-react";
import { useAnalyticsData } from "../../shared/lib/hooks/useAnalyticsData";
import { useLandingPageData } from "../../shared/lib/hooks/useLandingPageData";
import { VisitHistoryCard, VisitHistoryItem } from '../../shared/ui/VisitHistoryCard';
import { formatWindowHours } from "../../shared/lib/utils";

export function DashboardPage() {
  const { recentHistory, windowHours, refresh: refreshAnalytics } = useAnalyticsData();
  const { metrics, plots, loading, refresh: refreshLanding } = useLandingPageData("overview");

  // Map GraphQL analytics to topVisited format
  // In a real app, this would be a more complex mapping from MetricGroups to VisitHistoryItem
  const topVisited: VisitHistoryItem[] = []; 

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
            refreshAnalytics();
            refreshLanding();
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
        {/* Functional Component 1: Top Visited (Remote Data via GraphQL) */}
        <VisitHistoryCard
          title="Top Visited"
          subtitle={`Last ${formatWindowHours(windowHours)}`}
          icon={MapPin}
          iconColor="text-blue-500"
          items={topVisited}
          loading={loading}
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

      {/* Analytical Charts Section (Placeholders/Real Trends) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plots.map((plot: any) => (
          <div key={plot.id} className="h-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-4">
             <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">{plot.label}</h3>
             <div className="flex-1 flex items-center justify-center text-gray-400 italic text-center px-8">
               {plot.history ? "Trend Chart visualization would go here" : `Aggregate Metric: ${plot.sum || plot.avg || 'N/A'}`}
             </div>
          </div>
        ))}
        {plots.length === 0 && (
          <>
            <div className="h-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
              Ingestion Trends (Analytical Data)
            </div>
            <div className="h-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 italic">
              User Activity Heatmap (Analytical Data)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

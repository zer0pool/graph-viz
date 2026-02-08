import { useState, useEffect, useCallback } from "react";
import { config } from '../../api/config';
import { MetricData } from '../../ui/SummaryGrid';

interface DashboardMetricsResponse {
  metrics: MetricData[];
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_tables", value: 0, subtext: "Across all schemas" },
    { 
      type: "total_jobs", 
      value: 20, 
      subtext: "Active pipelines",
      breakdown: [
        { label: "Self-Type", value: 10, color: "bg-blue-600" },
        { label: "Request-Type", value: 10, color: "bg-amber-500" }
      ]
    },
    { type: "dummy_chart", value: "85%", subtext: "System Health" },
    { type: "dummy_chart", value: 12, subtext: "Active Alerts", status: "warning" },
    { type: "dummy_chart", value: "2.4 TB", subtext: "Daily Ingestion" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/analytics/dashboard-metrics`);
      
      if (!response.ok) {
        console.warn(`[Dashboard] Failed to fetch metrics: ${response.status}`);
        // Keep default metrics on error
        return;
      }
      
      const data: DashboardMetricsResponse = await response.json();
      
      // Merge breakdown for total_jobs if not provided by API
      const enrichedMetrics = data.metrics.map(m => {
        if (m.type === "total_jobs" && !m.breakdown) {
          return {
            ...m,
            breakdown: [
              { label: "Self-Type", value: 10, color: "bg-blue-600" },
              { label: "Request-Type", value: 10, color: "bg-amber-500" }
            ]
          };
        }
        return m;
      });
      
      setMetrics(enrichedMetrics);
    } catch (e) {
      console.error("[Dashboard] Error fetching metrics", e);
      // Keep default metrics on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    refresh: fetchMetrics,
  };
};

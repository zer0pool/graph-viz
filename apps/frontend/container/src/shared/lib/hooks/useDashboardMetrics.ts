import { useState, useEffect, useCallback } from "react";
import { MetricData } from '../../ui/SummaryGrid';
import { analyticsApi } from '../../api/analyticsApi';

const JOB_TYPE_COLORS: Record<string, string> = {
  "Self-Type": "bg-blue-600",
  "Request-Type": "bg-amber-500",
};

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_tables", value: 0, subtext: "Across all schemas" },
    { type: "total_jobs", value: 0, subtext: "Active Jobs" },
    { type: "total_users", value: 0, subtext: "Total Users" },
    { type: "dummy_chart", value: 0, subtext: "Active Alerts", status: "warning" },
    { type: "dummy_chart", value: "0 B", subtext: "Daily Ingestion" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getDashboardMetrics();
      
      const enrichedMetrics = data.metrics.map(m => {
        if (m.type === "total_jobs" && m.breakdown) {
          return {
            ...m,
            breakdown: m.breakdown.map(item => ({
              ...item,
              color: JOB_TYPE_COLORS[item.label] || "bg-gray-400"
            }))
          };
        }
        return m;
      });
      
      setMetrics(enrichedMetrics);
    } catch (e) {
      console.error("[Dashboard] Error fetching metrics:", e);
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

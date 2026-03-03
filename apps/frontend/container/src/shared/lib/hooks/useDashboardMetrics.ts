import { useState, useEffect, useCallback } from "react";
import { MetricData } from "../../ui/SummaryGrid";
import { analyticsApi } from "../../api/analyticsApi";

const JOB_TYPE_COLORS: Record<string, string> = {
  "Self-Type": "bg-blue-600",
  "Request-Type": "bg-amber-500",
};

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_assets", value: 0, label: "Total Assets" },
    { type: "active_users", value: 0, label: "Active Users" },
    { type: "daily_ingestion", value: "0 B", label: "Daily Ingestion" },
    { type: "system_health", value: "0%", label: "System Health" },
    { type: "failed_jobs", value: 0, label: "Active Alerts" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getOverviewSummary();

      const enrichedMetrics = data.metrics.map((m) => {
        if (m.type === "total_jobs" && m.breakdown) {
          return {
            ...m,
            breakdown: m.breakdown.map((item) => ({
              ...item,
              color: JOB_TYPE_COLORS[item.label] || "bg-gray-400",
            })),
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

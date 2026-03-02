import { useState, useEffect, useCallback } from "react";
import { MetricData } from "../../ui/SummaryGrid";
import { analyticsApi } from "../../api/analyticsApi";

const JOB_TYPE_COLORS: Record<string, string> = {
  "Self-Type": "bg-blue-600",
  "Request-Type": "bg-amber-500",
};

export const useJobsMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_jobs", value: 0, label: "Total Jobs" },
    { type: "running_jobs", value: 0, label: "Running Now" },
    { type: "failed_jobs", value: 0, label: "Failed (24h)" },
    { type: "avg_duration", value: "0m", label: "Avg. Duration" },
    { type: "sla_breach", value: 0, label: "SLA Breaches" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getJobsSummary();
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
      console.error("[Jobs] Error fetching metrics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refresh: fetchMetrics };
};

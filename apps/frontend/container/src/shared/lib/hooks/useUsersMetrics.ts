import { useState, useEffect, useCallback } from "react";
import { MetricData } from "../../ui/SummaryGrid";
import { analyticsApi } from "../../api/analyticsApi";

export const useUsersMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_users", value: 0, label: "Total Users" },
    { type: "active_users", value: 0, label: "Active (24h)" },
    { type: "admin_users", value: 0, label: "Admins" },
    { type: "api_keys", value: 0, label: "Active API Keys" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getUsersSummary();
      setMetrics(data.metrics);
    } catch (e) {
      console.error("[Users] Error fetching metrics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refresh: fetchMetrics };
};

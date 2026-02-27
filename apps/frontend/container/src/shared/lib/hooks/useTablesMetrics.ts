import { useState, useEffect, useCallback } from "react";
import { MetricData } from '../../ui/SummaryGrid';
import { analyticsApi } from '../../api/analyticsApi';

export const useTablesMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { type: "total_tables", value: 0, label: "Total Tables" },
    { type: "bq_tables", value: 0, label: "BigQuery Source" },
    { type: "storage_size", value: "0 B", label: "Metadata Size" },
    { type: "freshness", value: "0%", label: "Data Freshness" },
    { type: "expiring_soon", value: 0, label: "Expiring Soon" },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getTablesSummary();
      setMetrics(data.metrics);
    } catch (e) {
      console.error("[Tables] Error fetching metrics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refresh: fetchMetrics };
};

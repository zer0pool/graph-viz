import { useState, useEffect, useCallback, useMemo } from "react";
import { useApiClient } from "../../shared/api/ApiContext";

export function useTrendsSection() {
  const api = useApiClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      // Assuming there's a trend endpoint or we derive it
      const summary = await api.fetchSummaryMetrics();
      // Use trends from summary or trigger default fallback if not present
      setData(summary?.trends || (summary?.metrics ? null : null));
    } catch (err) {
      console.error("[useTrendsSection] Error fetching trends:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Static Fallbacks for Demo/Missing API
  const totalTables = data?.totalTables || 1548;
  const totalSize = data?.totalSize || 148.0;
  const totalDelayed = data?.totalDelayed || 79;
  const totalExpiring = data?.totalExpiring || 23;
  const slaBreach = data?.slaBreach || 3;

  const tablesTrend = useMemo(() => data?.tablesTrend || [
    { day: "Day 1", tables: 1420 },
    { day: "Day 5", tables: 1435 },
    { day: "Day 10", tables: 1458 },
    { day: "Day 15", tables: 1482 },
    { day: "Day 20", tables: 1510 },
    { day: "Day 25", tables: 1548 },
    { day: "Day 30", tables: 1548 },
  ], [data]);

  const storageTrend = useMemo(() => data?.storageTrend || [
    { day: "Day 1", size: 135.2 },
    { day: "Day 5", size: 136.8 },
    { day: "Day 10", size: 138.1 },
    { day: "Day 15", size: 139.5 },
    { day: "Day 20", size: 140.8 },
    { day: "Day 25", size: 141.6 },
    { day: "Day 30", size: 148.0 },
  ], [data]);

  const issuesTrend = useMemo(() => data?.issuesTrend || [
    { day: "Day 1", delayed: 45, expiring: 18, sla: 3 },
    { day: "Day 5", delayed: 52, expiring: 15, sla: 4 },
    { day: "Day 10", delayed: 58, expiring: 20, sla: 2 },
    { day: "Day 15", delayed: 62, expiring: 22, sla: 3 },
    { day: "Day 20", delayed: 68, expiring: 19, sla: 1 },
    { day: "Day 25", delayed: 72, expiring: 21, sla: 2 },
    { day: "Day 30", delayed: 79, expiring: 23, sla: 3 },
  ], [data]);

  return {
    loading,
    totalTables,
    totalSize,
    totalDelayed,
    totalExpiring,
    slaBreach,
    tablesTrend,
    storageTrend,
    issuesTrend,
    refresh: fetchTrends,
  };
}

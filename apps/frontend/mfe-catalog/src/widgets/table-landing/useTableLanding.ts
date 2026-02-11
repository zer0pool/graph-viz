import { useState, useEffect, useCallback, useMemo } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { datasetsData } from "../../shared/api/mockData";
import { MetricData } from "../../shared/ui/SummaryGrid";
import { MetricEntry } from "../../shared/types";

export type TableMetric = MetricData;

const DEFAULT_TABLE_METRICS: TableMetric[] = [
  { type: "total_tables", value: 1392, subtext: "+23 today" },
  { type: "total_datasets", value: 8, subtext: "6 schemas" },
  { type: "total_size", value: "148.0 TB", subtext: "+2.1 TB/day" },
  { type: "expiring_soon", value: 23, subtext: "< 7 days left" },
  { type: "lineage_coverage", value: "80.7%", subtext: "1124 / 1392" }
];

export function useTableLanding() {
  const api = useApiClient();
  const [metrics, setMetrics] = useState<TableMetric[]>(DEFAULT_TABLE_METRICS);
  const [datasets, setDatasets] = useState<any[]>(datasetsData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Summary Metrics
      const summary = await api.fetchSummaryMetrics();
      
      // 2. Fetch Tables (Datasets)
      const tablesData = await api.fetchTables(20, 0);
      const tables = tablesData.tables || tablesData || [];
      
      // 3. Transform Summary into TableMetrics
      const metricsList = summary?.metrics || [];
      
      if (metricsList.length > 0) {
        const findMetric = (type: string) => metricsList.find((m: MetricEntry) => m.type === type);
        const getMetricVal = (type: string) => findMetric(type)?.value;
        const getMetricSub = (type: string, def: string) => findMetric(type)?.subtext || def;

        const formattedMetrics: TableMetric[] = [
          { 
            type: "total_tables", 
            value: getMetricVal("total_tables") ?? 1392, 
            subtext: getMetricSub("total_tables", "+23 today") 
          },
          { 
            type: "total_datasets", 
            value: getMetricVal("total_datasets") ?? 8, 
            subtext: getMetricSub("total_datasets", "6 schemas") 
          },
          { 
            type: "total_size", 
            value: getMetricVal("total_size") ?? "148.0 TB", 
            subtext: getMetricSub("total_size", "+2.1 TB/day") 
          },
          { 
            type: "expiring_soon", 
            value: getMetricVal("expiring_soon") ?? 23, 
            subtext: getMetricSub("expiring_soon", "< 7 days left") 
          },
          { 
            type: "lineage_coverage", 
            value: getMetricVal("lineage_coverage") ?? "80.7%", 
            subtext: getMetricSub("lineage_coverage", "1124 / 1392") 
          }
        ];
        setMetrics(formattedMetrics);
      } else {
        setMetrics(DEFAULT_TABLE_METRICS);
      }

      setDatasets(tables.length > 0 ? tables : datasetsData);
    } catch (err: any) {
      console.error("[useTableLanding] Error fetching data:", err);
      setMetrics(DEFAULT_TABLE_METRICS);
      setDatasets(datasetsData);
      setError("Failed to load catalog data");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    metrics,
    datasets,
    loading,
    error,
    refresh: fetchData,
  };
}

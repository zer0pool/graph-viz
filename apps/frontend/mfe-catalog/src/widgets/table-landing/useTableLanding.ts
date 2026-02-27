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

import { useLandingPageData } from "../../shared/hooks/useLandingPageData";

export function useTableLanding() {
  const { 
    metrics, 
    entities, 
    loading, 
    error, 
    refresh 
  } = useLandingPageData("tables", { first: 20 });

  const datasets = useMemo(() => {
    return (entities?.edges || []).map(edge => edge.node);
  }, [entities]);

  return {
    metrics,
    datasets: datasets.length > 0 ? datasets : datasetsData, // Fallback to mock if empty
    loading,
    error: error ? error.message : null,
    refresh,
  };
}

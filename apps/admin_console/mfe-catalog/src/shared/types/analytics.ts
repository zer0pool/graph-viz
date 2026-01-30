export interface MetricEntry {
  type: string;
  value: string | number;
  subtext?: string;
  status?: "default" | "warning" | "critical";
}

export interface TrendPoint {
  day: string;
  [key: string]: string | number;
}

export interface SummaryMetricsResponse {
  metrics: MetricEntry[];
  trends?: {
    totalTables?: number;
    totalSize?: number;
    totalDelayed?: number;
    totalExpiring?: number;
    slaBreach?: number;
    tablesTrend?: TrendPoint[];
    storageTrend?: TrendPoint[];
    issuesTrend?: TrendPoint[];
  };
}

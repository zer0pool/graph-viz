// Analytics entity types

export interface AnalyticsMetric {
  type: string;
  value: number | string;
  subtext: string;
  status?: "default" | "warning" | "critical";
}

export interface VisitHistoryItem {
  path: string;
  title: string;
  meta: string; // "18 times" or "5 mins ago"
}

export interface DashboardMetricsResponse {
  metrics: AnalyticsMetric[];
}

export interface TopVisitedResponse {
  items: VisitHistoryItem[];
}

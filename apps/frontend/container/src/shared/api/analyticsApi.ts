import { config } from "./config";
import { MetricData } from "../ui/SummaryGrid";

interface SummaryMetricsResponse {
  metrics: MetricData[];
}

interface TopVisitedItem {
  path: string;
  title: string;
  count: number;
}

export interface TopVisitedResponse {
  items: TopVisitedItem[];
  window_days: number;
}

export const analyticsApi = {
  getOverviewSummary: async (): Promise<SummaryMetricsResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/analytics-manager/api/v1/metrics/summary/overview`
    );
    if (!response.ok) throw new Error("Failed to fetch overview summary");
    return response.json();
  },

  getJobsSummary: async (): Promise<SummaryMetricsResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/analytics-manager/api/v1/metrics/summary/jobs`
    );
    if (!response.ok) throw new Error("Failed to fetch jobs summary");
    return response.json();
  },

  getTablesSummary: async (): Promise<SummaryMetricsResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/analytics-manager/api/v1/metrics/summary/tables`
    );
    if (!response.ok) throw new Error("Failed to fetch tables summary");
    return response.json();
  },

  getUsersSummary: async (): Promise<SummaryMetricsResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/analytics-manager/api/v1/metrics/summary/users`
    );
    if (!response.ok) throw new Error("Failed to fetch users summary");
    return response.json();
  },

  getDashboardMetrics: async (): Promise<SummaryMetricsResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/analytics-manager/api/v1/analytics/dashboard-metrics`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard metrics");
    }
    return response.json();
  },

  getTopVisited: async (): Promise<TopVisitedResponse> => {
    const response = await fetch(
      `${config.BASE_URL}/lineage-manager/api/v1/analytics/top-visited`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch top visited");
    }
    return response.json();
  },
};

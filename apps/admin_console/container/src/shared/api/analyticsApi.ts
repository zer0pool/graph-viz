import { config } from "./config";
import { MetricData } from "../ui/SummaryGrid";

interface DashboardMetricsResponse {
  metrics: MetricData[];
}

interface TopVisitedItem {
  path: string;
  title: string;
  count: number;
}

export interface TopVisitedResponse {
  items: TopVisitedItem[];
  window_hours: number;
}

export const analyticsApi = {
  getDashboardMetrics: async (): Promise<DashboardMetricsResponse> => {
    const response = await fetch(`${config.API_BASE_URL}/api/v1/analytics/dashboard-metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard metrics: ${response.status}`);
    }
    return response.json();
  },

  getTopVisited: async (): Promise<TopVisitedResponse> => {
    const response = await fetch(`${config.API_BASE_URL}/api/v1/analytics/top-visited`);
    if (!response.ok) {
      throw new Error(`Failed to fetch top visited: ${response.status}`);
    }
    return response.json();
  },
};

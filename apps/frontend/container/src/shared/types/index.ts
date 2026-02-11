// Shared type definitions for Container app

export interface SearchSuggestion {
  type: 'job' | 'table' | 'owner';
  id: string;
  name: string;
}

export interface VisitHistoryItem {
  id: string;
  name: string;
  type: 'job' | 'table' | 'project';
  visitedAt?: string;
}

export interface AnalyticsMetric {
  type: string;
  value: number | string;
  subtext?: string;
  status?: 'success' | 'warning' | 'error';
}

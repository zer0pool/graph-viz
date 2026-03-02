export interface MetricGroup {
  id: string;
  label: string;
  count?: number;
  sum?: number;
  avg?: number;
  status: "default" | "success" | "info" | "warning" | "critical" | "destructive";
  breakdown?: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  dimensions?: {
    type?: string;
    project?: string;
    status?: string;
    name?: string;
  };
  history?: Array<{
    time: string;
    value: number;
    series?: string;
  }>;
}

export interface JobNode {
  id: string;
  displayLabel: string;
  config: {
    owner?: string;
    schedule?: string;
    projectId?: string;
    type?: string;
  };
  stats?: {
    avgSlots?: number;
    maxSlots?: number;
    totalDuration24h?: number;
    lastRunStatus?: string;
    updatedAt?: string;
  };
}

export interface TableNode {
  id: string;
  fqn: string;
  config: {
    owners: string[];
    upstreamJobs: string[];
    downstreamJobs: string[];
  };
  stats?: {
    rowCount?: number;
    totalSizeBytes?: number;
    lastUpdateTime?: string;
    appendCount24h?: number;
    updateMode?: string;
  };
}

export interface Connection<T> {
  totalCount: number;
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

export interface LandingPageResponse {
  topMetrics: MetricGroup[];
  analytics: MetricGroup[];
  entities: Connection<JobNode | TableNode> | null;
}

// Legacy Compatibility (Keep for interim period if needed)
export interface MetricEntry {
  type: string;
  value: string | number;
  label?: string;
  subtext?: string;
  status?: "default" | "warning" | "critical" | "success" | "info" | "destructive";
  breakdown?: { label: string; value: number | string; color?: string }[];
}

export interface SummaryMetricsResponse {
  metrics: MetricEntry[];
}

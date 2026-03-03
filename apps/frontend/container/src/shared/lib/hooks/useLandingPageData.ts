import { useState, useEffect, useCallback } from "react";
import { graphqlClient } from "../../api/graphqlClient";

export interface MetricGroup {
  id: string;
  label: string;
  count?: number;
  sum?: number;
  avg?: number;
  status: 'default' | 'success' | 'info' | 'warning' | 'critical' | 'destructive';
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

export interface LandingPageData {
  topMetrics: MetricGroup[];
  analytics: MetricGroup[];
  entities: Connection<JobNode | TableNode> | null;
}

// Mapping from Context to Metric IDs
const PAGE_METRIC_MAPPING: Record<string, { top: string[], analytics: string[] }> = {
  OVERVIEW: {
    top: ["total_jobs", "active_users", "total_tables", "system_health", "failed_24h"],
    analytics: []
  },
  JOBS: {
    top: ["total_jobs", "running_now", "failed_24h", "avg_duration", "queued_jobs"],
    analytics: ["job_type_breakdown"]
  },
  TABLES: {
    top: ["total_tables", "total_size", "expiring_soon", "lineage_coverage", "metadata_health"],
    analytics: []
  },
  USERS: {
    top: ["total_users", "active_users", "admin_users", "api_keys"],
    analytics: ["active_users_yoy_comparison"]
  }
};

const LANDING_PAGE_QUERY = `
  query GetLandingPageData(
    $metricIds: [String!]!, 
    $analyticIds: [String!]!, 
    $first: Int, 
    $after: String, 
    $includeJobs: Boolean = false,
    $includeTables: Boolean = false
  ) {
    topMetrics: metrics(ids: $metricIds) {
      id label count sum avg status
      breakdown { label value color }
    }
    analytics: metrics(ids: $analyticIds) {
      id label count sum
      dimensions { name type }
      history { time value series }
    }
    jobs(first: $first, after: $after) @include(if: $includeJobs) {
      totalCount
      edges {
        node {
          id
          displayLabel
          config { owner schedule projectId type }
          stats { avgSlots maxSlots totalDuration24h lastRunStatus updatedAt }
        }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
    tables(first: $first, after: $after) @include(if: $includeTables) {
      totalCount
      edges {
        node {
          id
          fqn
          config { owners upstreamJobs downstreamJobs }
          stats { rowCount totalSizeBytes lastUpdateTime appendCount24h updateMode }
        }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const useLandingPageData = (context: string, options: { first?: number; after?: string } = {}) => {
  const [data, setData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const ctx = context.toUpperCase();
    const mapping = PAGE_METRIC_MAPPING[ctx] || { top: [], analytics: [] };
    
    // Conditionals for entities
    const includeJobs = ctx === "JOBS";
    const includeTables = ctx === "TABLES";
    const needsEntities = includeJobs || includeTables;

    try {
      const variables: Record<string, any> = {
        metricIds: mapping.top,
        analyticIds: mapping.analytics,
      };

      if (includeJobs) variables.includeJobs = true;
      if (includeTables) variables.includeTables = true;

      // Only add pagination variables if we are actually fetching entities
      if (needsEntities) {
        variables.first = options.first || 10;
        variables.after = options.after;
      }

      const response = await graphqlClient.fetch<{ 
        topMetrics: MetricGroup[], 
        analytics: MetricGroup[], 
        jobs?: Connection<JobNode>,
        tables?: Connection<TableNode>
      }>(LANDING_PAGE_QUERY, variables);

      setData({
        topMetrics: response.topMetrics,
        analytics: response.analytics,
        entities: response.jobs || response.tables || null
      });
      setError(null);
    } catch (err) {
      console.error(`[GraphQL] Error fetching ${context} data:`, err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [context, options.first, options.after]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    // Map MetricGroup to MetricData format expected by SummaryGrid
    metrics: (data?.topMetrics || []).map(m => ({
      type: m.id,
      value: m.count ?? 0,
      label: m.label,
      status: m.status,
      breakdown: m.breakdown
    })),
    plots: data?.analytics || [],
    entities: data?.entities || null,
    loading,
    error,
    refresh: fetchData
  };
};

import { useState, useEffect, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { MetricData } from "../../shared/ui/SummaryGrid";

export type JobMetric = MetricData;

export interface JobRunFilter {
  jobId?: string;
  dagId?: string;
  types?: string[];
  destination?: string;
  owners?: string[];
  issuers?: string[];
  period?: string;
  projects?: string[];
  statuses?: string[];
  startedAtSince?: string;
  startedAtUntil?: string;
}

export interface JobRunFilterFacets {
  owners: string[];
  projects: string[];
  types: string[];
  issuers: string[];
  statuses: string[];
}

export interface Job {
  job_id: string;
  dag_id: string;
  project_id?: string;
  type: string;
  destination: string;
  owners: string[];
  issuer: string;
  start_time: string;
  next_start_time: string;
  period: string;
  date: string;
  hour: string;
  publish_time: string;
  status?: string;
  duration?: number;
  progress?: number;
  job_name?: string;
}

export function useJobLanding() {
  const api = useApiClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<JobMetric[]>([]);
  const [facets, setFacets] = useState<JobRunFilterFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(
    async (
      options: {
        offset?: number;
        limit?: number;
        refresh?: boolean;
        sortBy?: string;
        sortOrder?: "ASC" | "DESC";
        filter?: JobRunFilter;
      } = {}
    ) => {
      const {
        offset = 0,
        limit = 10,
        refresh = false,
        sortBy = null,
        sortOrder = "DESC",
        filter = null,
      } = options;
      setLoading(true);
      try {
        const query = `
        query GetJobLandingData($offset: Int, $limit: Int, $refresh: Boolean, $sortBy: ID, $sortOrder: SortOrder, $filter: JobRunFilter) {
          topMetrics: metrics(ids: ["total_jobs", "running_now", "failed_24h", "avg_duration", "queued_jobs"]) {
            id label count sum avg status
            breakdown { label value color }
          }
          recentJobRuns(offset: $offset, limit: $limit, refresh: $refresh, sortBy: $sortBy, sortOrder: $sortOrder, filter: $filter) {
            items {
              jobId
              dagId
              projectId
              type
              destination
              owners
              issuer
              startTime
              nextStartTime
              period
              date
              hour
              publishTime
            }
            totalCount
            facets {
              owners
              projects
              types
              issuers
              statuses
            }
          }
        }
      `;
        const result = await api.graphqlRequest<{
          topMetrics: any[];
          recentJobRuns: { items: any[]; totalCount: number; facets: JobRunFilterFacets };
        }>(query, { offset, limit, refresh, sortBy, sortOrder, filter });

        setMetrics(
          result.topMetrics.map((m) => ({
            type: m.id,
            value: m.count ?? 0,
            label: m.label,
            status: m.status,
            breakdown: m.breakdown,
          }))
        );

        setFacets(result.recentJobRuns.facets);
        setTotalCount(result.recentJobRuns.totalCount);
        setJobs(
          result.recentJobRuns.items.map((r) => ({
            job_id: r.jobId,
            dag_id: r.dagId,
            project_id: r.projectId,
            type: r.type,
            destination: r.destination,
            owners: r.owners,
            issuer: r.issuer,
            start_time: r.startTime,
            next_start_time: r.nextStartTime,
            period: r.period,
            date: r.date,
            hour: r.hour,
            publish_time: r.publishTime,
            status: r.status || "Completed",
            updated_at: r.startTime,
            job_name: r.jobId.split(".").pop() || r.jobId,
          }))
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("SUCCESS") || s.includes("COMPLETED")) return "text-green-600 bg-green-50";
    if (s.includes("RUNNING") || s.includes("PENDING")) return "text-blue-600 bg-blue-50";
    if (s.includes("FAILED") || s.includes("ERROR")) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return {
    jobs,
    metrics,
    facets,
    loading,
    error,
    totalCount,
    fetchData,
    refresh: () => fetchData({ refresh: true }),
    getStatusColor,
  };
}

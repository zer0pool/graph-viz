import { useState, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { MetricData } from "../../shared/ui/SummaryGrid";
import { JobRankingItem, JobListItem } from "../../entities/job/job";

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

// ---------------------------------------------------------------------------
// Query definitions — kept separate so each can be sent in parallel
// ---------------------------------------------------------------------------

const JOBS_QUERY = `
  query GetJobsData($offset: Int, $limit: Int, $refresh: Boolean, $sortBy: ID, $sortOrder: SortOrder, $filter: JobRunFilter) {
    topMetrics: metrics(ids: ["total_jobs", "running_now", "failed_24h", "avg_duration", "queued_jobs"]) {
      id label count sum avg status
      breakdown { label value color }
    }
    recentJobRuns(offset: $offset, limit: $limit, refresh: $refresh, sortBy: $sortBy, sortOrder: $sortOrder, filter: $filter) {
      items {
        jobId dagId projectId type destination owners issuer
        startTime nextStartTime period date hour publishTime
      }
      totalCount
      facets { owners projects types issuers statuses }
    }
  }
`;

const RANKING_QUERY = `
  query GetRankingData {
    jobSlotRanking(limit: 30) {
      jobId type valueYesterday value7dAvg changePct history7d
    }
    jobDurationRanking(limit: 30) {
      jobId type valueYesterday value7dAvg changePct history7d
    }
  }
`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJobLanding() {
  const api = useApiClient();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [metrics, setMetrics] = useState<JobMetric[]>([]);
  const [facets, setFacets] = useState<JobRunFilterFacets | null>(null);
  const [slotRanking, setSlotRanking] = useState<JobRankingItem[]>([]);
  const [durationRanking, setDurationRanking] = useState<JobRankingItem[]>([]);
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
        // Fire both queries in parallel — ranking is independent of jobs/metrics
        const [jobsResult, rankingResult] = await Promise.all([
          api.graphqlRequest<{
            topMetrics: any[];
            recentJobRuns: { items: any[]; totalCount: number; facets: JobRunFilterFacets };
          }>(JOBS_QUERY, { offset, limit, refresh, sortBy, sortOrder, filter }),

          api.graphqlRequest<{
            jobSlotRanking: JobRankingItem[];
            jobDurationRanking: JobRankingItem[];
          }>(RANKING_QUERY, {}),
        ]);

        setMetrics(
          jobsResult.topMetrics.map((m) => ({
            type: m.id,
            value: m.count ?? 0,
            label: m.label,
            status: m.status,
            breakdown: m.breakdown,
          }))
        );

        setFacets(jobsResult.recentJobRuns.facets);
        setTotalCount(jobsResult.recentJobRuns.totalCount);
        setJobs(
          jobsResult.recentJobRuns.items.map((r) => ({
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

        setSlotRanking(rankingResult.jobSlotRanking ?? []);
        setDurationRanking(rankingResult.jobDurationRanking ?? []);

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

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
    slotRanking,
    durationRanking,
    loading,
    error,
    totalCount,
    fetchData,
    refresh: () => fetchData({ refresh: true }),
    getStatusColor,
  };
}

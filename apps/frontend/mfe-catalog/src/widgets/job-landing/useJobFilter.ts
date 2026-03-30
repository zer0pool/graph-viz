import { useState, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { JobListItem } from "../../entities/job/job";

// GraphQL shape returned from analytics-manager.jobs
export interface GqlJob {
  id: string;
  displayLabel: string;
  config: { owner?: string; projectId?: string };
  stats?: { lastRunStatus?: string; updatedAt?: string; duration?: number; progress?: number };
}

// GraphQL expects a JobFilter input type; we pass a variable for flexibility
const JOB_FILTER_QUERY = `
  query FilterJobs($filter: JobFilter) {
    jobs(first: 50, filter: $filter) {
      totalCount
      edges {
        node {
          id
          displayLabel
          config { owner projectId }
          stats { lastRunStatus updatedAt duration progress }
        }
      }
    }
  }
`;

export interface JobFilterInput {
  searchTerm?: string;
  projectId?: string;
  owner?: string;
  status?: string;
}

export interface JobFilterResult {
  jobs: JobListItem[];
  loading: boolean;
  error: string | null;
  search: (filter: JobFilterInput) => Promise<void>;
}

export function useJobFilter(): JobFilterResult {
  const api = useApiClient();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (filter: JobFilterInput) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.graphqlRequest<{ jobs: { edges: { node: GqlJob }[] } }>(
          JOB_FILTER_QUERY,
          { filter: filter || null }
        );
        const adaptedJobs = data.jobs.edges.map((e) => {
          const node = e.node;
          return {
            job_id: node.id,
            job_name: node.displayLabel,
            project_id: node.config?.projectId,
            owners: node.config?.owner ? [node.config.owner] : [],
            status: node.stats?.lastRunStatus,
            duration: node.stats?.duration,
            progress: node.stats?.progress,
            type: "N/A",
            issuer: "System",
            start_time: node.stats?.updatedAt || "",
            // Additional required fields for JobListItem
            dag_id: "",
            destination: "",
            next_start_time: "",
            period: "",
            date: "",
            hour: "",
            publish_time: "",
          } as JobListItem;
        });
        setJobs(adaptedJobs);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setJobs([]);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  return { jobs, loading, error, search };
}

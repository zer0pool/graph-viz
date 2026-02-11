import { useState, useEffect } from "react";
import { JobDetail } from "../../../shared/types/job";
import { useApiClient } from "../../../shared/api/ApiContext";

export function useProjectJobs(projectId: string | undefined, limit: number = 20, offset: number = 0) {
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!projectId) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchProjectJobs(projectId, limit, offset)
      .then((data: any) => {
        if (mounted) {
          setJobs(data.jobs || []);
          setTotal(data.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [api, projectId, limit, offset]);

  return { jobs, total, loading, error };
}

import { useState, useEffect } from "react";
import { JobDetail } from "../types/job";
import { useApiClient } from "../components/ApiContext";

export function useJobOverview(jobId: string) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchJobDetail(jobId)
      .then((data) => {
        if (mounted) {
          setJob(data);
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
  }, [api, jobId]);

  return { job, loading, error };
}

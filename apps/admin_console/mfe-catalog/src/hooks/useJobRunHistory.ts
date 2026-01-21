import { useState, useEffect } from "react";
import { JobRun } from "../types/job";
import { useApiClient } from "../components/ApiContext";

export function useJobRunHistory(jobId: string) {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchJobRunHistory(jobId)
      .then((data) => {
        if (mounted) {
          setRuns(data.runs || []);
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

  return { runs, loading, error };
}

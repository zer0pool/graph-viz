import { useState, useEffect } from "react";
import { JobRun, JobRunHistoryResponse } from "../../../shared/types/job";
import { useApiClient } from "../../../shared/api/ApiContext";

export function useJobRunHistory(jobId: string) {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [summary, setSummary] = useState<JobRunHistoryResponse['summary'] | null>(null);
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
          // Map 'timeline' from API to 'runs' state
          setRuns(data.timeline || []);
          setSummary(data.summary || null);
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

  return { runs, summary, loading, error };
}

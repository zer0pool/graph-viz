import { useState, useEffect, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";

export function useProjectDetailView(projectId: string) {
  const api = useApiClient();
  const [project, setProject] = useState<any>(null);
  const [projectJobs, setProjectJobs] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [detailRes, jobsRes, usersRes] = await Promise.all([
        api.fetchProjectDetail(projectId),
        api.fetchProjectJobs(projectId, 100),
        api.fetchProjectUsers(projectId),
      ]);

      setProject(detailRes.project || detailRes);
      setProjectJobs(jobsRes.jobs || []);
      setProjectUsers(usersRes.users || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch project data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    project,
    projectJobs,
    projectUsers,
    loading,
    error,
    refresh: fetchData,
  };
}

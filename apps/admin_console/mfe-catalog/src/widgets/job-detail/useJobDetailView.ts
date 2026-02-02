import { useState, useCallback } from "react";
import { useJobOverview } from "../../entities/job/model/useJobOverview";
import { useJobRunHistory } from "../../entities/job/model/useJobRunHistory";
import { useProjectJobs } from "../../entities/job/model/useProjectJobs";
import { JobRun } from "../../shared/types/job";

export function useJobDetailView(jobId: string) {
  const [tab, setTab] = useState("info");
  const [selectedRun, setSelectedRun] = useState<JobRun | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 5;

  // Data Hooks
  const { job, loading: loadingJob, error: errorJob } = useJobOverview(jobId);
  const {
    runs,
    summary,
    loading: loadingRuns,
    error: errorRuns,
  } = useJobRunHistory(jobId);

  const { jobs: projectJobs, total: totalProjectJobs, loading: loadingProjectJobs } = useProjectJobs(
    job?.project_id || job?.properties?.project_id,
    pageSize,
    page * pageSize
  );

  const handleRunSelect = useCallback((runId: string) => {
    const run = runs.find((r) => r.run_id === runId);
    if (run) setSelectedRun(run);
  }, [runs]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedRun(null);
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage(p => p - 1);
  }, []);

  return {
    tab,
    setTab,
    selectedRun,
    setSelectedRun,
    job,
    loadingJob,
    errorJob,
    runs,
    summary,
    loadingRuns,
    errorRuns,
    projectJobs,
    totalProjectJobs,
    loadingProjectJobs,
    page,
    pageSize,
    handleRunSelect,
    handleCloseDrawer,
    handleNextPage,
    handlePrevPage
  };
}

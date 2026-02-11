import React, { useCallback } from "react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useJobLanding } from "../../widgets/job-landing/useJobLanding";
import { JobLandingView } from "../../widgets/job-landing/JobLandingView";

export const JobLanding: React.FC = () => {
  const navigate = useMfeNavigate();
  const { jobs, metrics, loading, error, refresh, getStatusColor } = useJobLanding();

  const handleNavigateToJob = useCallback((jobId: string) => {
    navigate(`/jobs/${encodeURIComponent(jobId)}`);
  }, [navigate]);

  return (
    <JobLandingView
      jobs={jobs}
      metrics={metrics}
      loading={loading}
      error={error}
      onRefresh={refresh}
      onNavigateToJob={handleNavigateToJob}
      getStatusColor={getStatusColor}
    />
  );
};

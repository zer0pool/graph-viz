import React, { useCallback } from "react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useJobLanding } from "../../widgets/job-landing/useJobLanding";
import { JobLandingView } from "../../widgets/job-landing/JobLandingView";

export const JobLanding: React.FC = () => {
  const navigate = useMfeNavigate();
  const {
    jobs, metrics, facets, slotRanking, durationRanking,
    loading, error, totalCount, fetchData, refresh, getStatusColor,
  } = useJobLanding();

  const handleNavigateToJob = useCallback(
    (jobId: string) => {
      navigate(`/jobs/${encodeURIComponent(jobId)}`);
    },
    [navigate]
  );

  return (
    <JobLandingView
      jobs={jobs}
      metrics={metrics}
      facets={facets}
      slotRanking={slotRanking}
      durationRanking={durationRanking}
      loading={loading}
      error={error}
      totalCount={totalCount}
      onRefresh={refresh}
      onFetchData={fetchData}
      onNavigateToJob={handleNavigateToJob}
      getStatusColor={getStatusColor}
    />
  );
};

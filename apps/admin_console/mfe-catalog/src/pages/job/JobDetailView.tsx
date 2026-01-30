import React, { useCallback } from "react";
import { ViewMode } from "../../types";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useJobDetailView } from "../../widgets/job-detail/useJobDetailView";
import { JobDetailViewPresenter } from "../../widgets/job-detail/JobDetailViewPresenter";

export const JobDetailView: React.FC<{
  jobId: string;
  mode?: ViewMode;
}> = ({ jobId, mode = "EMBEDDED" }) => {
  const navigate = useMfeNavigate();
  const logic = useJobDetailView(jobId);

  const handleNavigateToJob = useCallback((id: string) => {
    navigate(`/jobs/${id}`);
  }, [navigate]);

  return (
    <JobDetailViewPresenter
      jobId={jobId}
      mode={mode}
      {...logic}
      onTabChange={logic.setTab}
      onSetSelectedRun={logic.setSelectedRun}
      onNavigateToJob={handleNavigateToJob}
      onNextPage={logic.handleNextPage}
      onPrevPage={logic.handlePrevPage}
      onRunSelect={logic.handleRunSelect}
      onCloseDrawer={logic.handleCloseDrawer}
    />
  );
};

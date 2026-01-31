import React, { useCallback } from "react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { useProjectDetailView } from "../../widgets/project-detail/useProjectDetailView";
import { ProjectDetailViewPresenter } from "../../widgets/project-detail/ProjectDetailViewPresenter";

export const ProjectDetailView: React.FC<{ projectId: string }> = ({
  projectId,
}) => {
  const navigate = useMfeNavigate();
  const logic = useProjectDetailView(projectId);

  const handleNavigateToJob = useCallback((id: string) => {
    navigate(`/jobs/${id}`);
  }, [navigate]);

  const handleNavigateToTable = useCallback((id: string) => {
    navigate(`/tables/${id}`);
  }, [navigate]);

  return (
    <ProjectDetailViewPresenter
      projectId={projectId}
      {...logic}
      onNavigateToJob={handleNavigateToJob}
      onNavigateToTable={handleNavigateToTable}
    />
  );
};

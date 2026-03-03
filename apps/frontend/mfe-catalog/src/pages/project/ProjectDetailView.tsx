import React from "react";
import { ViewMode } from "../../shared/types";
import { useProjectDetailView } from "../../widgets/project-detail/useProjectDetailView";
import { ProjectDetailViewPresenter } from "../../widgets/project-detail/ProjectDetailViewPresenter";

export const ProjectDetailView: React.FC<{
  projectId: string;
  mode?: ViewMode;
}> = ({ projectId, mode = "PAGE" }) => {
  const logic = useProjectDetailView(projectId);

  const handleNavigateToJob = (id: string) => {
    window.dispatchEvent(
      new CustomEvent("mfe:navigate", {
        detail: { path: `/jobs/${encodeURIComponent(id)}` },
      })
    );
  };

  const handleNavigateToUser = (id: string) => {
    window.dispatchEvent(
      new CustomEvent("mfe:navigate", {
        detail: { path: `/users/${encodeURIComponent(id)}` },
      })
    );
  };

  return (
    <ProjectDetailViewPresenter
      projectId={projectId}
      mode={mode}
      {...logic}
      onNavigateToJob={handleNavigateToJob}
      onNavigateToUser={handleNavigateToUser}
    />
  );
};

import { useMemo } from "react";
import { mockProjects, mockJobs } from "../../shared/api/mockData";

export function useProjectDetailView(projectId: string) {
  const project = useMemo(() => mockProjects.find((p: any) => p.id === projectId), [projectId]);
  const projectJobs = useMemo(() => mockJobs.filter((j: any) => j.projectId === projectId), [projectId]);

  return {
    project,
    projectJobs,
  };
}

import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { JobDetailView } from "../../pages/job/JobDetailView";
import { TableDetailView } from "../../pages/table/TableDetailView";
import { ProjectDetailView } from "../../pages/project/ProjectDetailView";
import { JobLanding } from "../../pages/landing/JobLanding";
import { TableLanding } from "../../pages/landing/TableLanding";
import { config } from "../../shared/config/config";

const JobPage = () => {
  const { jobId } = useParams();
  if (!jobId) return null;
  return <JobDetailView jobId={jobId} mode="PAGE" />;
};

const TablePage = () => {
  const { tableName } = useParams();
  if (!tableName) return null;
  return <TableDetailView tableName={tableName} mode="PAGE" />;
};

const ProjectPage = () => {
  const { projectId } = useParams();
  if (!projectId) return null;
  return <ProjectDetailView projectId={projectId} />;
};

export const ViewApp = () => (
  <BrowserRouter basename={config.BASE_URL}>
    <Routes>
      <Route
        index
        element={
          <div className="p-8 text-center text-slate-500">
            Please select a view from the sidebar
          </div>
        }
      />
      <Route path="jobs" element={<JobLanding />} />
      <Route path="jobs/:jobId" element={<JobPage />} />
      <Route path="tables" element={<TableLanding />} />
      <Route path="tables/:tableName" element={<TablePage />} />
      <Route path="projects/:projectId" element={<ProjectPage />} />
    </Routes>
  </BrowserRouter>
);

import React from "react";
import { useLocation } from "react-router-dom";
import { Selection } from "../../shared/types";
import { JobDetailView } from "../../pages/job/JobDetailView";
import { TableDetailView } from "../../pages/table/TableDetailView";
import { ProjectDetailView } from "../../pages/project/ProjectDetailView";
import { JobLanding } from "../../pages/landing/JobLanding";
import { TableLanding } from "../../pages/landing/TableLanding";

// 🔹 Fallback Components
const MessageView: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-8 text-center text-slate-500 italic">{message}</div>
);

export const TableDetailViewer: React.FC<{ selection: Selection | null }> = ({ selection }) => {
  const { pathname: path } = useLocation();

  // 1. Path-based Dispatching (Static Landing & Project Context)
  if (path === "/jobs" || path === "/jobs/") return <JobLanding />;
  if (path === "/tables" || path === "/tables/") return <TableLanding />;

  const projectMatch = path.match(/^\/projects\/([^/]+)/);
  if (projectMatch) return <ProjectDetailView projectId={projectMatch[1]} />;

  // 2. Selection-based Dispatching (Node clicks)
  // If no selection prop but at a detail URL, try to extract from current URL (for direct deep links)
  if (!selection) {
    const jobMatch = path.match(/^\/jobs\/([^/]+)/);
    if (jobMatch) return <JobDetailView jobId={jobMatch[1]} mode="STANDALONE" />;

    const tableMatch = path.match(/^\/tables\/([^/]+)/);
    if (tableMatch) return <TableDetailView tableName={tableMatch[1]} mode="STANDALONE" />;

    return <MessageView message="Select a job or table to view details" />;
  }

  // 3. Entity Type Routing
  return renderEntityDetail(selection);
};

/**
 * Renders the detail view based on selection type and ID
 */
function renderEntityDetail(selection: Selection) {
  const { type, id, jobId, tableName } = selection;

  if (type === "job") {
    const targetId = jobId || id;
    if (!targetId) return <MessageView message="Job ID missing" />;
    const cleanId = targetId.replace(/^job:/, "");
    return <JobDetailView jobId={cleanId} mode="EMBEDDED" />;
  }

  if (type === "table") {
    const targetName = tableName || id;
    if (!targetName) return <MessageView message="Table name missing" />;
    const cleanName = targetName.replace(/^table:/, "");
    return <TableDetailView tableName={cleanName} mode="EMBEDDED" />;
  }

  return <MessageView message={`Unsupported entity type: ${type}`} />;
}

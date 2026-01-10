import React from "react";
import { Selection } from "./types";
import { JobDetailView } from "./views/job/JobDetailView";
import { TableDetailView } from "./views/table/TableDetailView";

export const TableDetailViewer: React.FC<{ selection: Selection | null }> = ({
  selection,
}) => {
  if (!selection) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Select a job or table to view details
      </div>
    );
  }

  // Route to JobDetailView if it's a job
  const jobId =
    selection.jobId || (selection.type === "job" ? selection.id : null);
  if (selection.type === "job" && jobId) {
    const cleanJobId = jobId.startsWith("job:") ? jobId.substring(4) : jobId;
    console.log("[TableDetailViewer] Routing to JobDetailView:", cleanJobId);
    return <JobDetailView jobId={cleanJobId} mode="EMBEDDED" />;
  }

  // Route to TableDetailView if it's a table
  const tableName =
    selection.tableName || (selection.type === "table" ? selection.id : null);
  if (selection.type === "table" && tableName) {
    const cleanTableName = tableName.startsWith("table:")
      ? tableName.substring(6)
      : tableName;
    console.log(
      "[TableDetailViewer] Routing to TableDetailView:",
      cleanTableName
    );
    return <TableDetailView tableName={cleanTableName} mode="EMBEDDED" />;
  }

  console.warn(
    "[TableDetailViewer] Could not determine targets for selection:",
    selection
  );
  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
      Unknown selection type: {JSON.stringify(selection)}
    </div>
  );
};

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
  if (selection.type === "job" && selection.jobId) {
    return <JobDetailView jobId={selection.jobId} mode="EMBEDDED" />;
  }

  // Route to TableDetailView if it's a table
  if (selection.type === "table" && selection.tableName) {
    return <TableDetailView tableName={selection.tableName} mode="EMBEDDED" />;
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
      Unknown selection type: {JSON.stringify(selection)}
    </div>
  );
};

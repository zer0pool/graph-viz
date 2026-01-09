import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { JobDetailView } from "./views/job/JobDetailView";
import { TableDetailView } from "./views/table/TableDetailView";

console.log("ViewApp mounted");

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

export const ViewApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/jobs/:jobId" element={<JobPage />} />
      <Route path="/tables/:tableName" element={<TablePage />} />
    </Routes>
  </BrowserRouter>
);

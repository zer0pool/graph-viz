import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { JobDetailView } from "./views/job/JobDetailView";
import { TableDetailView } from "./views/table/TableDetailView";
import { Briefcase, Table2 } from "lucide-react";

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

import { TableLanding } from "./views/landing/TableLanding";

const JobLanding = () => (
  <div className="p-8">
    <div className="bg-white rounded-xl shadow-sm border border-border p-8 text-center max-w-2xl mx-auto mt-10">
      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Jobs Explorer</h1>
      <p className="text-gray-500 mb-6">
        Explore and monitor all your data processing jobs from here.
      </p>
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        Job list view is currently being integrated...
      </div>
    </div>
  </div>
);

export const ViewApp = () => (
  <BrowserRouter basename="/admin-console">
    <Routes>
      <Route index element={<div className="p-8">Please select a view</div>} />
      <Route path="jobs" element={<JobLanding />} />
      <Route path="jobs/:jobId" element={<JobPage />} />
      <Route path="tables" element={<TableLanding />} />
      <Route path="tables/:tableName" element={<TablePage />} />
    </Routes>
  </BrowserRouter>
);

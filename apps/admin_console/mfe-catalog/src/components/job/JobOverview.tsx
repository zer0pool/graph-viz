import React from "react";
import { JobDetail } from "../../types/job";

interface JobOverviewProps {
  job: JobDetail;
  loading?: boolean;
}

export const JobOverview: React.FC<JobOverviewProps> = ({ job, loading }) => {
  if (loading) {
    return <div className="p-4 text-gray-500">Loading job details...</div>;
  }

  const summary = job.run_summary || {
    success: 0,
    failed: 0,
    running: 0,
    total: 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total" value={summary.total} color="blue" />
        <SummaryCard label="Success" value={summary.success} color="green" />
        <SummaryCard label="Failed" value={summary.failed} color="red" />
        <SummaryCard label="Running" value={summary.running} color="yellow" />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {job.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  job.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {job.status}
              </span>
              {job.labels &&
                Object.entries(job.labels).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs font-medium border border-gray-200"
                  >
                    {v != null ? `${k}: ${v}` : k}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
          <Field label="Owner" value={job.owner} />
          <Field label="Platform" value={job.labels?.platform} />
          <Field label="Job Type" value={job.type} />
          <Field label="Status" value={job.status} isBadge={true} />
          <Field label="Lifecycle" value={job.lifecycle_status} />
          <Field label="Schedule" value={job.schedule} />
          <Field label="Last Run" value={job.last_run_time} />
          <Field label="Next Run" value={job.next_run_time} />
          <div className="col-span-full bg-gray-50 p-4 rounded-lg border border-gray-100">
            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest text">
              Description
            </label>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap italic">
              {job.description || "No description provided."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  color: "blue" | "green" | "red" | "yellow";
}> = ({ label, value, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  return (
    <div
      className={`p-4 rounded-lg border ${colors[color]} text-center shadow-sm transition-transform hover:scale-105`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">
        {label}
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string; isBadge?: boolean }> = ({
  label,
  value,
  isBadge,
}) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
      {label}
    </label>
    {isBadge && value ? (
      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100">
        {value}
      </span>
    ) : (
      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
        {value || "—"}
      </div>
    )}
  </div>
);

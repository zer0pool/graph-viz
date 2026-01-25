import React from "react";
import { mockJobs } from "../../data/mockData";
import { useMfeNavigate } from "../../utils/navigation";

export const JobLanding: React.FC = () => {
  const navigate = useMfeNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "text-green-600 bg-green-50";
      case "RUNNING":
        return "text-blue-600 bg-blue-50";
      case "FAILED":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Batch Jobs</h1>
        <p className="text-slate-500">Monitor and manage all data pipelines</p>
      </header>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-bottom border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Job Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Last Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {mockJobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    {job.name}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-600">{job.project}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-600">{job.owner}</span>
                </td>
                <td className="px-6 py-4 text-slate-500">{job.lastRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

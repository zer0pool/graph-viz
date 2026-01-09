import React from "react";
import { JobRun } from "../../types/job";

interface JobRunHistoryProps {
  runs: JobRun[];
  loading?: boolean;
  onRunSelect?: (runId: string) => void;
}

export const JobRunHistory: React.FC<JobRunHistoryProps> = ({
  runs,
  loading,
  onRunSelect,
}) => {
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading run history...
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No duration history available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Start Time
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Duration
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Triggered By
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {runs.map((run) => (
            <tr
              key={run.run_id}
              onClick={() => onRunSelect?.(run.run_id)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    run.status === "Success" || run.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : run.status === "Failed" || run.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {run.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {run.start_time}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {run.duration ? `${run.duration}s` : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {run.triggered_by || "Schedule"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import React, { useState } from "react";
import { JobRun } from "../../types/job";
import { formatDuration } from "../../utils";

interface JobRunHistoryProps {
  runs: JobRun[];
  loading?: boolean;
  onRunSelect?: (runId: string) => void;
}

const PAGE_SIZE = 10;

export const JobRunHistory: React.FC<JobRunHistoryProps> = ({
  runs,
  loading,
  onRunSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
        <div className="text-gray-500 font-medium">
          Loading execution logs...
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
        <div className="text-gray-400 font-medium">
          No run history found for this period.
        </div>
      </div>
    );
  }

  const pageCount = Math.ceil(runs.length / PAGE_SIZE);
  const startIdx = currentPage * PAGE_SIZE;
  const pageRuns = runs.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Trigger
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {pageRuns.map((run) => (
              <tr
                key={run.run_id}
                onClick={() => onRunSelect?.(run.run_id)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusPill status={run.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {run.start_time}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {run.duration ? formatDuration(run.duration) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                    {run.triggered_by || "Schedule"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">
            Showing{" "}
            <span className="text-gray-900 font-bold">{startIdx + 1}</span> to{" "}
            <span className="text-gray-900 font-bold">
              {Math.min(startIdx + PAGE_SIZE, runs.length)}
            </span>{" "}
            of <span className="text-gray-900 font-bold">{runs.length}</span>{" "}
            runs
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-md shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            <span className="flex items-center px-3 text-xs font-bold text-gray-600">
              {currentPage + 1} / {pageCount}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pageCount - 1, p + 1))
              }
              disabled={currentPage === pageCount - 1}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-md shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const isSuccess = /success|completed|done/.test(s);
  const isFailed = /failed|error|cancelled/.test(s);
  const isRunning = /running|pending|queued/.test(s);

  let colors = "bg-gray-100 text-gray-800 border-gray-200";
  if (isSuccess) colors = "bg-green-100 text-green-800 border-green-200";
  if (isFailed) colors = "bg-red-100 text-red-800 border-red-200";
  if (isRunning) colors = "bg-blue-100 text-blue-800 border-blue-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isSuccess
            ? "bg-green-500"
            : isFailed
            ? "bg-red-500"
            : isRunning
            ? "bg-blue-500"
            : "bg-gray-500"
        }`}
      ></span>
      {status}
    </span>
  );
};

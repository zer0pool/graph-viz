import React from "react";
import { JobRun } from "../../shared/types/job";
import { formatDuration } from "../../shared/lib/utils";

interface JobRunDrawerProps {
  run: JobRun | null;
  onClose: () => void;
}

export const JobRunDrawer: React.FC<JobRunDrawerProps> = ({ run, onClose }) => {
  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-gray-900 bg-opacity-50 transition-opacity">
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Run Details</h3>
            <p className="text-sm text-gray-500 font-mono">{run.run_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6">
            <DetailField label="Status" value={run.status} isStatus />
            <DetailField
              label="Triggered By"
              value={run.triggered_by || "Schedule"}
            />
            <DetailField label="Start Time" value={run.start_time} />
            <DetailField label="End Time" value={run.end_time || "-"} />
            <DetailField
              label="Duration"
              value={formatDuration(run.duration)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailField: React.FC<{
  label: string;
  value: string;
  isStatus?: boolean;
}> = ({ label, value, isStatus }) => (
  <div>
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
      {label}
    </div>
    {isStatus ? (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm transition-all ${
          value.toLowerCase().includes("success") ||
          value.toLowerCase().includes("completed")
            ? "bg-green-100 text-green-800"
            : value.toLowerCase().includes("fail") ||
              value.toLowerCase().includes("error")
            ? "bg-red-100 text-red-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {value}
      </span>
    ) : (
      <div className="text-sm font-medium text-gray-900">{value}</div>
    )}
  </div>
);

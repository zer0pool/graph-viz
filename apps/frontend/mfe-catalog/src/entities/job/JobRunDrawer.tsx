import React from "react";
import { JobRun } from "../../shared/types/job";
import { formatDuration } from "../../shared/lib/utils";

interface JobRunDrawerProps {
  run: JobRun | null;
  onClose: () => void;
}

export const JobRunDrawer: React.FC<JobRunDrawerProps> = ({ run, onClose }) => {
  console.log("[JobRunDrawer] Rendering with run:", run);
  if (!run) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-end overflow-hidden bg-gray-900 bg-opacity-50 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col h-full animate-slide-in-right border-l border-[#e5e7eb]">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Run Details</h3>
            <p className="text-xs text-[#6b7280] font-mono">{run.run_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6b7280] hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0 divide-y divide-[#f3f4f6]">
          <PropertyRow label="Status" value={run.status || "Unknown"} isStatus />
          <PropertyRow
            label="Triggered By"
            value={run.triggered_by || "Schedule"}
          />
          <PropertyRow label="Start Time" value={run.start_time} />
          <PropertyRow label="End Time" value={run.end_time || "-"} />
          <PropertyRow
            label="Duration"
            value={formatDuration(run.duration)}
          />
        </div>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{
  label: string;
  value: string;
  isStatus?: boolean;
}> = ({ label, value, isStatus }) => (
  <div className="flex justify-between py-4 items-center">
    <span className="text-sm text-[#6b7280]">{label}</span>
    {isStatus ? (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm transition-all ${
          String(value || "").toLowerCase().includes("success") ||
          String(value || "").toLowerCase().includes("completed")
            ? "bg-green-100 text-green-800"
            : String(value || "").toLowerCase().includes("fail") ||
              String(value || "").toLowerCase().includes("error")
            ? "bg-red-100 text-red-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {value || "-"}
      </span>
    ) : (
      <div className="text-sm font-medium text-[#111827]">{value || "-"}</div>
    )}
  </div>
);

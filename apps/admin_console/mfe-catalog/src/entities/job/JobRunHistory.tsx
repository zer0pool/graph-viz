import React, { useState } from "react";
import { JobRun } from "../../shared/types/job";
import { formatDuration } from "../../shared/lib/utils";

interface JobRunHistoryProps {
  runs: JobRun[];
  summary?: {
    total: number;
    running: number;
    success: number;
    failed: number;
  } | null;
  loading?: boolean;
  onRunSelect?: (runId: string) => void;
}

const PAGE_SIZE = 10;

export const JobRunHistory: React.FC<JobRunHistoryProps> = ({
  runs,
  summary,
  loading,
  onRunSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1a73e8] border-t-transparent mb-4"></div>
        <div className="text-gray-500 font-medium font-sans">
          Loading execution logs...
        </div>
      </div>
    );
  }

  const pageCount = Math.ceil(runs.length / PAGE_SIZE);
  const startIdx = currentPage * PAGE_SIZE;
  const pageRuns = runs.slice(startIdx, startIdx + PAGE_SIZE);

  // Helper to format date uniformly
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  };

  // Calculate period string
  const sortedByTime = [...runs].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const startTimeRaw = sortedByTime[0]?.start_time;
  const endTimeRaw = sortedByTime[sortedByTime.length - 1]?.start_time;
  const periodStr = startTimeRaw && endTimeRaw 
    ? `${formatDate(startTimeRaw)} ~ ${formatDate(endTimeRaw)}` 
    : "No runs in this period";

  return (
    <div className="space-y-6">
      {/* 1. Period Description */}
      <div className="flex items-center gap-2 px-1 text-sm text-[#5f6368]">
        <span className="font-bold text-[#202124]">Period:</span>
        <span className="font-sans">{periodStr}</span>
      </div>

      {/* 2. Summary Header */}
      {summary && (
        <div className="flex gap-16 py-5 px-8 bg-[#f8f9fa] border border-[#dadce0] rounded-xl shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">Total Runs</div>
            <div className="text-2xl font-medium text-[#202124]">{summary.total}</div>
          </div>
          <div className="w-px h-10 bg-[#dadce0] self-center" />
          <div className="flex gap-12">
            <div>
              <div className="text-[11px] font-bold text-[#1e8e3e] uppercase tracking-wider mb-1">Success</div>
              <div className="text-2xl font-medium text-[#1e8e3e]">{summary.success}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#d93025] uppercase tracking-wider mb-1">Failed</div>
              <div className="text-2xl font-medium text-[#d93025]">{summary.failed}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#1a73e8] uppercase tracking-wider mb-1">Running</div>
              <div className="text-2xl font-medium text-[#1a73e8]">{summary.running}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detailed Table */}
      {runs.length === 0 ? (
        <div className="p-16 text-center bg-[#f8f9fa] rounded-xl border-2 border-dashed border-[#dadce0]">
          <div className="text-gray-400 font-medium">
            No run history found for this period.
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-[#dadce0]">
              <thead className="bg-[#f8f9fa]">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-widest">
                    Trigger
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f1f3f4]">
                {pageRuns.map((run) => (
                  <tr
                    key={run.run_id}
                    onClick={() => onRunSelect?.(run.run_id)}
                    className="hover:bg-[#f8f9fa] cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#202124] font-medium font-sans">
                      {formatDate(run.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5f6368] font-sans">
                      {formatDate(run.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5f6368] font-mono">
                      {run.run_id.replace(/^scheduled_?_/, '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5f6368] font-mono">
                      {run.duration || (run as any).duration_sec ? formatDuration(run.duration || (run as any).duration_sec) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] px-2 py-1 bg-[#f1f3f4] text-[#5f6368] rounded font-bold uppercase tracking-tight border border-[#dadce0]">
                        {run.triggered_by || "Schedule"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-white border border-[#dadce0] rounded-xl shadow-sm">
              <div className="text-xs text-[#5f6368] font-sans">
                Showing <span className="font-bold text-[#202124]">{startIdx + 1}</span>-
                <span className="font-bold text-[#202124]">{Math.min(startIdx + PAGE_SIZE, runs.length)}</span> of{" "}
                <span className="font-bold text-[#202124]">{runs.length}</span> runs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-1.5 text-xs font-medium text-[#3c4043] bg-white border border-[#dadce0] rounded hover:bg-[#f1f3f4] disabled:opacity-40 transition-all font-sans"
                >
                  Previous
                </button>
                <div className="text-xs text-[#5f6368] px-3 font-sans">
                  Page <span className="font-bold text-[#202124]">{currentPage + 1}</span> / {pageCount}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  disabled={currentPage === pageCount - 1}
                  className="px-4 py-1.5 text-xs font-medium text-[#3c4043] bg-white border border-[#dadce0] rounded hover:bg-[#f1f3f4] disabled:opacity-40 transition-all font-sans"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
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
  if (isSuccess) colors = "bg-green-50 text-green-700 border-green-100";
  if (isFailed) colors = "bg-red-50 text-red-700 border-red-100";
  if (isRunning) colors = "bg-blue-50 text-blue-700 border-blue-100";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isSuccess
            ? "bg-green-600"
            : isFailed
            ? "bg-red-600"
            : isRunning
            ? "bg-blue-600"
            : "bg-gray-500"
        }`}
      ></span>
      {status}
    </span>
  );
};

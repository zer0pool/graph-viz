import React, { useEffect } from "react";
import { GCPDateTimePicker } from "../../shared/ui/GCPDateTimePicker";
import {
  RefreshCw,
  Filter,
  X,
  Columns3,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { JobSummary } from "../../entities/job/JobSummary";
import { JobTopLists } from "../../entities/job/JobTopLists";
import { Job, JobMetric, JobRankingItem, JobRunFilterFacets } from "./useJobLanding";
import { useJobLandingState } from "./useJobLandingState";

interface JobLandingViewProps {
  jobs: Job[];
  metrics: JobMetric[];
  facets: JobRunFilterFacets | null;
  slotRanking?: JobRankingItem[];
  durationRanking?: JobRankingItem[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  onRefresh: () => void;
  onFetchData: (options: {
    offset?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    filter?: any;
  }) => void;
  onNavigateToJob: (jobId: string) => void;
  getStatusColor: (status: string) => string;
}

const formatNumericDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return "-";
  }
};

// available columns for Jobs table (mirrors Figma example)
const availableColumns = [
  { id: "job", label: "Job ID" },
  { id: "publish_time", label: "Publish Time" },
  { id: "dag", label: "DAG ID" },
  { id: "type", label: "Type" },
  { id: "project", label: "Project" },
  { id: "destination", label: "Destination" },
  { id: "issuer", label: "Issuer" },
  { id: "owner", label: "Owner" },
  { id: "period", label: "Period" },
  { id: "date", label: "Date" },
  { id: "hour", label: "Hour" },
  { id: "start_time", label: "Start Time" },
  { id: "next_start", label: "Next Start" },
  { id: "status", label: "Status" },
];

export function JobLandingView({
  jobs,
  metrics,
  facets,
  slotRanking = [],
  durationRanking = [],
  loading,
  error,
  totalCount,
  onRefresh,
  onFetchData,
  onNavigateToJob,
  getStatusColor,
}: JobLandingViewProps) {
  const {
    ITEMS_PER_PAGE,
    currentPage,
    totalPages,
    handlePageChange,
    sortState,
    handleSort,
    showFilter,
    setShowFilter,
    filters,
    setFilters,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    showColumns,
    setShowColumns,
    visibleColumns,
    setVisibleColumns,
    tempVisibleColumns,
    setTempVisibleColumns,
    ownerSearch,
    setOwnerSearch,
    showOwnerDropdown,
    setShowOwnerDropdown,
    tempOwners,
    setTempOwners,
    filteredOwners,
    projectSearch,
    setProjectSearch,
    showProjectDropdown,
    setShowProjectDropdown,
    tempProjects,
    setTempProjects,
    filteredProjects,
    statusSearch,
    setStatusSearch,
    showStatusDropdown,
    setShowStatusDropdown,
    tempStatuses,
    setTempStatuses,
    filteredStatuses,
    timeRange,
    setTimeRange,
    showCustomRange,
    setShowCustomRange,
    customRange,
    setCustomRange,
    handleApplyCustomRange,
    getTimeRangeFilter,
  } = useJobLandingState(facets, onFetchData);

  // Initialize visible columns once availableColumns is defined
  React.useEffect(() => {
    if (visibleColumns.length === 0) {
      setVisibleColumns(availableColumns.map((c) => c.id));
    }
  }, []);

  const isColumnVisible = (colId: string) => visibleColumns.includes(colId);

  const totalPageCount = totalPages(totalCount);

  useEffect(() => {
    const timeFilter = getTimeRangeFilter();
    onFetchData({
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
      filter: { ...activeFilters, ...timeFilter },
      sortBy: sortState.sortBy,
      sortOrder: sortState.sortOrder,
    });
  }, [currentPage, activeFilters, timeRange, customRange.since, customRange.until, sortState]);

  return (
    <div className="p-6">
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-slate-900">Job Monitoring</h1>
        <p className="text-slate-500">Monitor and manage all data pipelines</p>
      </header>

      <div className="animate-fade-in-up delay-100">
        <JobSummary metrics={metrics} loading={loading} />
      </div>

      <div className="animate-fade-in-up delay-200">
        <JobTopLists slotRanking={slotRanking} durationRanking={durationRanking} loading={loading} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-8 animate-fade-in-up delay-300">
        {/* Table Header / Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-semibold text-slate-700">
            Recently Finished Jobs (Total: {totalCount})
          </h3>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center bg-slate-200/50 p-1 rounded-lg border border-slate-200">
              {["1h", "12h", "1d", "7d", "30d"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                    timeRange === range
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-100"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {range}
                </button>
              ))}

              <div className="relative ml-1">
                <button
                  onClick={() => setShowCustomRange(!showCustomRange)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${
                    timeRange === "custom"
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-100"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Custom{" "}
                  {timeRange === "custom" && (
                    <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  )}
                </button>

                {showCustomRange && (
                  <>
                    <div
                      className="fixed inset-0 z-[75]"
                      onClick={() => setShowCustomRange(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-xl z-[80] p-4 animate-fade-in-down">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-xs text-slate-800">Custom range</h4>
                        <X
                          className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600"
                          onClick={() => setShowCustomRange(false)}
                        />
                      </div>
                      <div className="space-y-5">
                        <GCPDateTimePicker
                          label="Start date and time"
                          value={customRange.since}
                          onChange={(date) => setCustomRange((prev) => ({ ...prev, since: date }))}
                        />
                        <GCPDateTimePicker
                          label="End date and time"
                          value={customRange.until}
                          onChange={(date) => setCustomRange((prev) => ({ ...prev, until: date }))}
                          minDate={customRange.since}
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => setShowCustomRange(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApplyCustomRange}
                          disabled={!customRange.since || !customRange.until}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 relative">
              <button
                className={`p-2 rounded-md ${showColumns ? "bg-slate-200 shadow-inner" : "bg-white shadow-sm"} border border-slate-200 hover:bg-slate-100 transition-colors`}
                onClick={() => {
                  setTempVisibleColumns(visibleColumns);
                  setShowColumns(!showColumns);
                }}
                title="Show columns"
              >
                <Columns3 className="h-4 w-4 text-slate-600" />
              </button>
              <button
                className={`p-2 rounded-md ${showFilter ? "bg-slate-200 shadow-inner" : "bg-white shadow-sm"} border border-slate-200 hover:bg-slate-100 transition-colors`}
                onClick={() => setShowFilter(!showFilter)}
                title="Show filters"
              >
                <Filter className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={onRefresh}
                className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
              </button>

              {/* Column Selection Popover */}
              {showColumns && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowColumns(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-2xl border border-slate-200 z-[70] overflow-hidden animate-fade-in-down">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-800">Displayed columns</h4>
                    </div>

                    <div className="p-1">
                      <div
                        className="px-2 py-2 border-b border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/30 mb-1"
                        onClick={() => {
                          if (tempVisibleColumns.length === availableColumns.length) {
                            setTempVisibleColumns([]);
                          } else {
                            setTempVisibleColumns(availableColumns.map((c) => c.id));
                          }
                        }}
                      >
                        <div className="text-blue-600">
                          {tempVisibleColumns.length === availableColumns.length ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : tempVisibleColumns.length > 0 ? (
                            <MinusSquare className="w-4 h-4 fill-blue-600 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {tempVisibleColumns.length === 0
                            ? "Select all"
                            : tempVisibleColumns.length === availableColumns.length
                              ? `All ${availableColumns.length} selected`
                              : `${tempVisibleColumns.length} of ${availableColumns.length} selected`}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {availableColumns.map((col) => (
                          <label
                            key={col.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={tempVisibleColumns.includes(col.id)}
                              onChange={() => {
                                setTempVisibleColumns((prev) =>
                                  prev.includes(col.id)
                                    ? prev.filter((x) => x !== col.id)
                                    : [...prev, col.id]
                                );
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-600 group-hover:text-slate-900 flex-1">
                              {col.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                      <button
                        onClick={() => setShowColumns(false)}
                        className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setVisibleColumns(tempVisibleColumns);
                          setShowColumns(false);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 shadow-sm"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                {availableColumns.map((col) => {
                  if (!isColumnVisible(col.id)) return null;
                  const isSorted = sortState.sortBy === col.id;
                  return (
                    <th
                      key={col.id}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group"
                      onClick={() => handleSort(col.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <div
                          className={`flex flex-col -space-y-1 ${isSorted ? "text-blue-600" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
                        >
                          <ChevronUp
                            className={`w-2.5 h-2.5 ${isSorted && sortState.sortOrder === "ASC" ? "" : "opacity-40"}`}
                          />
                          <ChevronDown
                            className={`w-2.5 h-2.5 ${isSorted && sortState.sortOrder === "DESC" ? "" : "opacity-40"}`}
                          />
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      Loading jobs...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-6 py-12 text-center text-red-500 bg-red-50/20"
                  >
                    {error}
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No jobs found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={`${job.job_id}-${job.start_time}`}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {isColumnVisible("job") && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onNavigateToJob(job.job_id)}
                          className="text-start font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {job.job_id}
                        </button>
                      </td>
                    )}
                    {isColumnVisible("publish_time") && (
                      <td className="px-6 py-4 text-slate-500 text-xs tabular-nums">
                        {formatNumericDate(job.publish_time)}
                      </td>
                    )}
                    {isColumnVisible("dag") && (
                      <td className="px-6 py-4 text-slate-600">{job.dag_id || "-"}</td>
                    )}
                    {isColumnVisible("type") && (
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                          {job.type || "N/A"}
                        </span>
                      </td>
                    )}
                    {isColumnVisible("project") && (
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {job.project_id || "-"}
                      </td>
                    )}
                    {isColumnVisible("destination") && (
                      <td
                        className="px-6 py-4 text-slate-500 text-xs truncate max-w-[150px]"
                        title={job.destination}
                      >
                        {job.destination || "-"}
                      </td>
                    )}
                    {isColumnVisible("issuer") && (
                      <td className="px-6 py-4 text-slate-600 text-xs">{job.issuer || "-"}</td>
                    )}
                    {isColumnVisible("owner") && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          {job.owners && job.owners.length > 0 ? job.owners[0] : "-"}
                          {job.owners && job.owners.length > 1 && (
                            <span className="text-[10px] bg-slate-100 px-1 rounded">
                              +{job.owners.length - 1}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {isColumnVisible("period") && (
                      <td className="px-6 py-4 text-slate-600 text-xs italic">
                        {job.period || "-"}
                      </td>
                    )}
                    {isColumnVisible("date") && (
                      <td className="px-6 py-4 text-slate-600 tabular-nums">{job.date || "-"}</td>
                    )}
                    {isColumnVisible("hour") && (
                      <td className="px-6 py-4 text-slate-600 tabular-nums">{job.hour || "-"}</td>
                    )}
                    {isColumnVisible("start_time") && (
                      <td className="px-6 py-4 text-slate-500 text-xs tabular-nums">
                        {formatNumericDate(job.start_time)}
                      </td>
                    )}
                    {isColumnVisible("next_start") && (
                      <td className="px-6 py-4 text-slate-500 text-xs tabular-nums">
                        {formatNumericDate(job.next_start_time)}
                      </td>
                    )}
                    {isColumnVisible("status") && (
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${getStatusColor(job.status || "")}`}
                        >
                          {job.status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold">
                {Math.min(totalCount, (currentPage - 1) * ITEMS_PER_PAGE + 1)}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(totalCount, currentPage * ITEMS_PER_PAGE)}
              </span>{" "}
              of <span className="font-semibold">{totalCount}</span> jobs
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPageCount) }, (_, i) => {
                  let pageNum = currentPage;
                  if (totalPageCount <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPageCount - 2) pageNum = totalPageCount - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] rounded transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={currentPage === totalPageCount || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Slide-over */}
      {showFilter && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowFilter(false)}
          />
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in-right">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Filters</h2>
              <button
                onClick={() => setShowFilter(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* identification group */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">
                    Identification
                  </label>
                  <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700">Job ID</label>
                      <input
                        type="text"
                        value={filters.jobId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, jobId: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md py-1.5 px-2 text-xs outline-none focus:border-blue-500"
                        placeholder="e.g. ad-platform-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700">DAG ID</label>
                      <input
                        type="text"
                        value={filters.dagId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dagId: e.target.value }))}
                        className="w-full border border-slate-200 rounded-md py-1.5 px-2 text-xs outline-none focus:border-blue-500"
                        placeholder="e.g. airflow-dag-123"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* metadata group */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Metadata</label>
                  <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {/* Owner Filter */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-medium text-slate-700">Owner</label>
                      <div
                        onClick={() => {
                          setTempOwners(filters.owners);
                          setShowOwnerDropdown(!showOwnerDropdown);
                        }}
                        className="flex flex-wrap gap-1 min-h-[36px] w-full border border-slate-200 rounded-md py-1.5 px-2 text-[11px] cursor-pointer hover:border-blue-400 bg-white"
                      >
                        {filters.owners.length === 0 ? (
                          <span className="text-slate-400">Select Owners...</span>
                        ) : (
                          filters.owners.map((o) => (
                            <span
                              key={o}
                              className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              {o}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-blue-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilters((prev) => ({
                                    ...prev,
                                    owners: prev.owners.filter((x) => x !== o),
                                  }));
                                }}
                              />
                            </span>
                          ))
                        )}
                      </div>

                      {showOwnerDropdown && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[60] overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type to filter"
                              value={ownerSearch}
                              onChange={(e) => setOwnerSearch(e.target.value)}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 p-0"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredOwners.length > 0 && (
                              <div
                                className="px-2 py-2 border-b border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/30 mb-1"
                                onClick={() => {
                                  if (tempOwners.length === filteredOwners.length) {
                                    setTempOwners([]);
                                  } else {
                                    setTempOwners(filteredOwners);
                                  }
                                }}
                              >
                                <div className="text-blue-600">
                                  {tempOwners.length === filteredOwners.length ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : tempOwners.length > 0 ? (
                                    <MinusSquare className="w-4 h-4 fill-blue-600 text-white" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-700">
                                  {tempOwners.length === 0
                                    ? "Select all"
                                    : tempOwners.length === filteredOwners.length
                                      ? `All ${filteredOwners.length} selected`
                                      : `${tempOwners.length} of ${filteredOwners.length} selected`}
                                </span>
                              </div>
                            )}
                            {filteredOwners.map((owner) => (
                              <label
                                key={owner}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={tempOwners.includes(owner)}
                                  onChange={() => {
                                    setTempOwners((prev) =>
                                      prev.includes(owner)
                                        ? prev.filter((x) => x !== owner)
                                        : [...prev, owner]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-600 group-hover:text-slate-900 truncate">
                                  {owner}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button
                              onClick={() => setShowOwnerDropdown(false)}
                              className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, owners: tempOwners }));
                                setShowOwnerDropdown(false);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 shadow-sm"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Project Filter */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-medium text-slate-700">Project</label>
                      <div
                        onClick={() => {
                          setTempProjects(filters.projects);
                          setShowProjectDropdown(!showProjectDropdown);
                        }}
                        className="flex flex-wrap gap-1 min-h-[36px] w-full border border-slate-200 rounded-md py-1.5 px-2 text-[11px] cursor-pointer hover:border-blue-400 bg-white"
                      >
                        {filters.projects.length === 0 ? (
                          <span className="text-slate-400">Select Projects...</span>
                        ) : (
                          filters.projects.map((p) => (
                            <span
                              key={p}
                              className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              {p}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-blue-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilters((prev) => ({
                                    ...prev,
                                    projects: prev.projects.filter((x) => x !== p),
                                  }));
                                }}
                              />
                            </span>
                          ))
                        )}
                      </div>

                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[60] overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type to filter"
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 p-0"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredProjects.length > 0 && (
                              <div
                                className="px-2 py-2 border-b border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/30 mb-1"
                                onClick={() => {
                                  if (tempProjects.length === filteredProjects.length) {
                                    setTempProjects([]);
                                  } else {
                                    setTempProjects(filteredProjects);
                                  }
                                }}
                              >
                                <div className="text-blue-600">
                                  {tempProjects.length === filteredProjects.length ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : tempProjects.length > 0 ? (
                                    <MinusSquare className="w-4 h-4 fill-blue-600 text-white" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-700">
                                  {tempProjects.length === 0
                                    ? "Select all"
                                    : tempProjects.length === filteredProjects.length
                                      ? `All ${filteredProjects.length} selected`
                                      : `${tempProjects.length} of ${filteredProjects.length} selected`}
                                </span>
                              </div>
                            )}
                            {filteredProjects.map((project) => (
                              <label
                                key={project}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={tempProjects.includes(project)}
                                  onChange={() => {
                                    setTempProjects((prev) =>
                                      prev.includes(project)
                                        ? prev.filter((x) => x !== project)
                                        : [...prev, project]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-600 group-hover:text-slate-900 truncate">
                                  {project}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button
                              onClick={() => setShowProjectDropdown(false)}
                              className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, projects: tempProjects }));
                                setShowProjectDropdown(false);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 shadow-sm"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-medium text-slate-700">Status</label>
                      <div
                        onClick={() => {
                          setTempStatuses(filters.statuses);
                          setShowStatusDropdown(!showStatusDropdown);
                        }}
                        className="flex flex-wrap gap-1 min-h-[36px] w-full border border-slate-200 rounded-md py-1.5 px-2 text-[11px] cursor-pointer hover:border-blue-400 bg-white"
                      >
                        {filters.statuses.length === 0 ? (
                          <span className="text-slate-400">Select Statuses...</span>
                        ) : (
                          filters.statuses.map((s) => (
                            <span
                              key={s}
                              className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              {s}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-blue-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilters((prev) => ({
                                    ...prev,
                                    statuses: prev.statuses.filter((x) => x !== s),
                                  }));
                                }}
                              />
                            </span>
                          ))
                        )}
                      </div>

                      {showStatusDropdown && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[60] overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type to filter"
                              value={statusSearch}
                              onChange={(e) => setStatusSearch(e.target.value)}
                              className="w-full bg-transparent border-none text-xs focus:ring-0 p-0"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredStatuses.length > 0 && (
                              <div
                                className="px-2 py-2 border-b border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/30 mb-1"
                                onClick={() => {
                                  if (tempStatuses.length === filteredStatuses.length) {
                                    setTempStatuses([]);
                                  } else {
                                    setTempStatuses(filteredStatuses);
                                  }
                                }}
                              >
                                <div className="text-blue-600">
                                  {tempStatuses.length === filteredStatuses.length ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : tempStatuses.length > 0 ? (
                                    <MinusSquare className="w-4 h-4 fill-blue-600 text-white" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-700">
                                  {tempStatuses.length === 0
                                    ? "Select all"
                                    : tempStatuses.length === filteredStatuses.length
                                      ? `All ${filteredStatuses.length} selected`
                                      : `${tempStatuses.length} of ${filteredStatuses.length} selected`}
                                </span>
                              </div>
                            )}
                            {filteredStatuses.map((status) => (
                              <label
                                key={status}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={tempStatuses.includes(status)}
                                  onChange={() => {
                                    setTempStatuses((prev) =>
                                      prev.includes(status)
                                        ? prev.filter((x) => x !== status)
                                        : [...prev, status]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-600 group-hover:text-slate-900 truncate">
                                  {status}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button
                              onClick={() => setShowStatusDropdown(false)}
                              className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, statuses: tempStatuses }));
                                setShowStatusDropdown(false);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 shadow-sm"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-300 transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

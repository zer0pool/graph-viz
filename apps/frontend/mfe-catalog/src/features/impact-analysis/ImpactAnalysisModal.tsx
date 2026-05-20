import { useState } from "react";
import { X, Download, Database, AlertCircle } from "lucide-react";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { ImpactFiltersBar } from "./ImpactFiltersBar";
import { ImpactResultsTable } from "./ImpactResultsTable";
import { ImpactPagination } from "./ImpactPagination";
import { useImpactAnalysis } from "./useImpactAnalysis";
import { useImpactFilters } from "./useImpactFilters";
import { exportToCsv } from "./exportCsv";
import { ImpactRow } from "./types";

interface ImpactAnalysisModalProps {
  tableName: string;
  onClose: () => void;
}

export function ImpactAnalysisModal({ tableName, onClose }: ImpactAnalysisModalProps) {
  const navigate = useMfeNavigate();
  const [maxDepth, setMaxDepth] = useState(3);

  const { allRows, sources, loading, error } = useImpactAnalysis(tableName, maxDepth);

  const {
    filters,
    pendingMaxDistance,
    filteredRows,
    pagedRows,
    currentPage,
    totalPages,
    pageSize,
    updateFilter,
    setPendingMaxDistance,
    applyFilters,
    setPage,
  } = useImpactFilters(allRows);

  function handleApply() {
    const newFilters = applyFilters();
    if (newFilters.maxDistance !== maxDepth) {
      setMaxDepth(newFilters.maxDistance);
    }
  }

  function handleRowClick(row: ImpactRow) {
    if (row.type === "Table") {
      navigate(`/tables/${encodeURIComponent(row.name)}`);
    } else {
      navigate(`/jobs/${encodeURIComponent(row.name)}`);
    }
    onClose();
  }

  const displayName = tableName.split(".").pop() ?? tableName;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[110] bg-black/40"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-900">Impact Analysis</h2>
              <p className="text-[13px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                Show objects that are impacted downstream from
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700">
                  <Database className="h-3.5 w-3.5 text-blue-500" />
                  {displayName}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => exportToCsv(filteredRows, tableName)}
                disabled={filteredRows.length === 0 || loading}
                className="h-8 px-3 flex items-center gap-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                Export to CSV
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <ImpactFiltersBar
            filters={filters}
            pendingMaxDistance={pendingMaxDistance}
            sources={sources}
            onFilterChange={updateFilter}
            onPendingMaxDistanceChange={setPendingMaxDistance}
            onApply={handleApply}
            loading={loading}
          />

          {/* Error state */}
          {error && !loading && (
            <div className="flex items-center gap-3 mx-6 my-4 p-4 bg-red-50 border border-red-100 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Results table */}
          {!error && (
            <ImpactResultsTable
              rows={pagedRows}
              loading={loading}
              onRowClick={handleRowClick}
            />
          )}

          {/* Pagination */}
          <ImpactPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredRows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
}

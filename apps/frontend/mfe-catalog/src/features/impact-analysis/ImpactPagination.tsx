import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImpactPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}

export function ImpactPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onClose,
}: ImpactPaginationProps) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white shrink-0">
      {/* Left: count */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          {start}–{end} of {totalCount}
        </span>
      </div>

      {/* Right: page nav + done */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-600">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="h-8 px-4 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

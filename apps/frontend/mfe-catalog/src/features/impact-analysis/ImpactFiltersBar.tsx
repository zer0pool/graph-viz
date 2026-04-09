import { Loader2 } from "lucide-react";
import { cn } from "../../shared/lib/utils";
import { ImpactFilters } from "./types";

interface ImpactFiltersBarProps {
  filters: ImpactFilters;
  pendingMaxDistance: number;
  sources: string[];
  onFilterChange: (partial: Partial<ImpactFilters>) => void;
  onPendingMaxDistanceChange: (val: number) => void;
  onApply: () => void;
  loading: boolean;
}

const selectClass =
  "h-[30px] border border-slate-200 rounded-md bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400";

export function ImpactFiltersBar({
  filters,
  pendingMaxDistance,
  sources,
  onFilterChange,
  onPendingMaxDistanceChange,
  onApply,
  loading,
}: ImpactFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
      <span className="text-xs font-medium text-slate-500 self-center">Where</span>

      {/* Object Type */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-slate-400">Object Type is</span>
        <select
          value={filters.objectType}
          onChange={(e) =>
            onFilterChange({ objectType: e.target.value as ImpactFilters["objectType"] })
          }
          className={cn(selectClass, "w-[100px]")}
        >
          <option value="All">All</option>
          <option value="Table">Table</option>
          <option value="Job">Job</option>
        </select>
      </div>

      {/* Source */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-slate-400">Source is</span>
        <select
          value={filters.source}
          onChange={(e) => onFilterChange({ source: e.target.value })}
          className={cn(selectClass, "w-[160px]")}
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s.length > 30 ? `${s.slice(0, 30)}…` : s}
            </option>
          ))}
        </select>
      </div>

      {/* Steward — static */}
      <div className="flex flex-col gap-0.5 opacity-50">
        <span className="text-[11px] text-slate-400">Steward is</span>
        <select disabled className={cn(selectClass, "w-[100px] cursor-not-allowed")}>
          <option>All</option>
        </select>
      </div>

      {/* Max Distance stepper */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-slate-400">Max Distance is</span>
        <div className="flex items-center h-[30px] border border-slate-200 rounded-md overflow-hidden">
          <button
            onClick={() => onPendingMaxDistanceChange(Math.max(1, pendingMaxDistance - 1))}
            disabled={pendingMaxDistance <= 1}
            className="w-7 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 text-base leading-none"
          >
            −
          </button>
          <span className="w-10 text-center text-xs font-bold text-slate-800">
            {pendingMaxDistance}
          </span>
          <button
            onClick={() => onPendingMaxDistanceChange(Math.min(10, pendingMaxDistance + 1))}
            disabled={pendingMaxDistance >= 10}
            className="w-7 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border-l border-slate-200 text-base leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* Apply button */}
      <div className="self-end">
        <button
          onClick={onApply}
          disabled={loading}
          className="h-[30px] px-3.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Apply Filters
        </button>
      </div>
    </div>
  );
}

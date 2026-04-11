import React from "react";
import { Search, Database, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { Badge } from "../../shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/card";
import { Input } from "../../shared/ui/input";
import { Button } from "../../shared/ui/button";
import { TableFilterValues, TableFacets, ITEMS_PER_PAGE } from "./useTableFilter";

interface DatasetsTableViewProps {
  filters: TableFilterValues;
  pendingFilters: TableFilterValues;
  setPendingFilters: (f: TableFilterValues) => void;
  setSearch: (v: string) => void;
  showFilter: boolean;
  setShowFilter: (v: boolean) => void;
  facets: TableFacets;
  applyFilters: () => void;
  clearFilters: () => void;
  activeFilterCount: number;
  pagedDatasets: any[];
  filteredDatasets: any[];
  maxSize: number;
  loading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  onViewDetail: (name: string) => void;
}

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  stable: "bg-blue-50 text-blue-700 border-blue-100",
  warning: "bg-orange-50 text-orange-700 border-orange-100",
  restricted: "bg-red-50 text-red-700 border-red-100",
};

export function DatasetsTableView({
  filters,
  pendingFilters,
  setPendingFilters,
  setSearch,
  showFilter,
  setShowFilter,
  facets,
  applyFilters,
  clearFilters,
  activeFilterCount,
  pagedDatasets,
  filteredDatasets,
  maxSize,
  loading,
  currentPage,
  setCurrentPage,
  totalPages,
  onViewDetail,
}: DatasetsTableViewProps) {
  const rangeStart = filteredDatasets.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredDatasets.length);

  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden">
      {/* ── Card Header ── */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-slate-50/50 border-b border-slate-100">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            All Datasets
          </CardTitle>
          <CardDescription className="text-slate-500">
            Complete list of datasets with health metrics
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search datasets..."
              className="pl-10 bg-white border-slate-200 focus:ring-primary/20 transition-all"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 ${showFilter ? "bg-indigo-50 border-indigo-300 text-indigo-700" : ""}`}
            onClick={() => setShowFilter(!showFilter)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* ── Filter Panel ── */}
      {showFilter && (
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
            {/* Service */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service
              </p>
              <div className="flex flex-wrap gap-1.5">
                {facets.services.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setPendingFilters({
                        ...pendingFilters,
                        services: toggleItem(pendingFilters.services, s),
                      })
                    }
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      pendingFilters.services.includes(s)
                        ? "border-indigo-400 bg-indigo-100 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Owner */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner
              </p>
              <div className="flex flex-wrap gap-1.5">
                {facets.owners.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() =>
                      setPendingFilters({
                        ...pendingFilters,
                        owners: toggleItem(pendingFilters.owners, o),
                      })
                    }
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      pendingFilters.owners.includes(o)
                        ? "border-indigo-400 bg-indigo-100 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {facets.statuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      setPendingFilters({
                        ...pendingFilters,
                        statuses: toggleItem(pendingFilters.statuses, st),
                      })
                    }
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                      pendingFilters.statuses.includes(st)
                        ? "border-indigo-400 bg-indigo-100 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Health */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Health
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={pendingFilters.hasDelayed}
                    onChange={(e) =>
                      setPendingFilters({ ...pendingFilters, hasDelayed: e.target.checked })
                    }
                  />
                  Has Delayed
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={pendingFilters.hasExpiring}
                    onChange={(e) =>
                      setPendingFilters({ ...pendingFilters, hasExpiring: e.target.checked })
                    }
                  />
                  Has Expiring
                </label>
              </div>
            </div>
          </div>

          {/* Filter actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] text-slate-600 font-semibold h-12">Dataset</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">#Tables</TableHead>
              <TableHead className="w-[220px] text-slate-600 font-semibold h-12">Total Size</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">Delayed</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">Expiring</TableHead>
              <TableHead className="text-slate-600 font-semibold h-12">Last Modified</TableHead>
              <TableHead className="text-slate-600 font-semibold h-12">Status</TableHead>
              <TableHead className="text-slate-600 font-semibold h-12">Service</TableHead>
              <TableHead className="text-right text-slate-600 font-semibold h-12 pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pagedDatasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-slate-400 italic">
                  No datasets found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              pagedDatasets.map((dataset) => (
                <TableRow
                  key={dataset.id || dataset.name}
                  className="group hover:bg-slate-50/80 transition-colors"
                >
                  <TableCell className="font-semibold text-slate-900 py-4 px-4">
                    {dataset.name}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">{dataset.tables}</TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700">{dataset.size}</span>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden max-w-[160px]">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${maxSize > 0 ? ((dataset.sizeBytes || dataset.storage_info?.size_bytes || 0) / maxSize) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {dataset.delayed > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-orange-50 text-orange-700 border-orange-100 font-medium"
                      >
                        {dataset.delayed}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {dataset.expiring > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50/50 text-amber-700 font-medium"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {dataset.expiring}
                        </div>
                      </Badge>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs py-4">
                    {dataset.lastModified}
                  </TableCell>
                  <TableCell className="py-4">
                    {dataset.status && (
                      <Badge
                        variant="outline"
                        className={`capitalize font-normal ${STATUS_COLORS[dataset.status] ?? "border-slate-200 text-slate-600"}`}
                      >
                        {dataset.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className="font-normal text-slate-600 bg-white border-slate-200"
                    >
                      {dataset.service}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-primary/10 hover:text-primary font-bold transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => onViewDetail(dataset.name)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* ── Pagination Footer ── */}
      {!loading && filteredDatasets.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-5 py-3">
          <span className="text-xs text-slate-500">
            {rangeStart}–{rangeEnd} of {filteredDatasets.length} datasets
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

import React from "react";
import { RefreshCw, Database, Search } from "lucide-react";
import { TableTopLists } from "../../entities/table/TableTopLists";
import { TableRankingItem } from "../../shared/api/types/lineage";
import { Button } from "../../shared/ui/button";
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
import { cn } from "../../shared/lib/utils";
import { TableListItem } from "../../shared/api/types/lineage";
import { TableListFilter } from "./useTableLanding";

interface TableLandingViewProps {
  tables: TableListItem[];
  totalCount: number;
  sizeRanking: TableRankingItem[];
  rowsRanking: TableRankingItem[];
  loading: boolean;
  rankingLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onFetchData: (options: {
    offset?: number;
    limit?: number;
    sortOrder?: "ASC" | "DESC";
    filter?: TableListFilter | null;
  }) => void;
}

const ITEMS_PER_PAGE = 10;

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes >= 1_099_511_627_776) return `${(bytes / 1_099_511_627_776).toFixed(1)} TB`;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatRows(count: number | null): string {
  if (count === null || count === undefined) return "—";
  return count.toLocaleString();
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day} ${h}:${mi}`;
  } catch {
    return iso;
  }
}

function WriteModeCell({ mode }: { mode: string | null }) {
  if (!mode) return <span className="text-slate-300">—</span>;
  const modeUpper = mode.toUpperCase();
  let badgeClass = "px-2 py-0.5 border-blue-200 bg-blue-50 text-blue-700 font-normal text-[11px]";

  if (modeUpper === "FULLDUMP") {
    badgeClass = "px-2 py-0.5 border-purple-200 bg-purple-50 text-purple-700 font-normal text-[11px]";
  } else if (modeUpper === "UPSERT") {
    badgeClass = "px-2 py-0.5 border-teal-200 bg-teal-50 text-teal-700 font-normal text-[11px]";
  }

  return (
    <Badge variant="outline" className={badgeClass}>
      {mode}
    </Badge>
  );
}

export function TableLandingView({
  tables,
  totalCount,
  sizeRanking,
  rowsRanking,
  loading,
  rankingLoading,
  error,
  search,
  onSearchChange,
  onRefresh,
  onFetchData,
}: TableLandingViewProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onFetchData({ offset: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE });
  };

  const handleSearch = (value: string) => {
    onSearchChange(value);
    setCurrentPage(1);
    onFetchData({
      offset: 0,
      limit: ITEMS_PER_PAGE,
      filter: value ? { table: value } : null,
    });
  };

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  // 페이지 번호 버튼 목록 (최대 5개)
  const pageNumbers = (() => {
    const pages: number[] = [];
    const maxPages = Math.min(5, totalPages);
    let start: number;
    if (totalPages <= 5) {
      start = 1;
    } else if (currentPage <= 3) {
      start = 1;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 4;
    } else {
      start = currentPage - 2;
    }
    for (let i = 0; i < maxPages; i++) pages.push(start + i);
    return pages;
  })();

  return (
    <div className="flex-1 p-4 space-y-4 overflow-auto">
      {/* Page Header */}
      <header className="flex items-center justify-between animate-fade-in-up mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            BigQuery table list sorted by last modified time
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      {/* Top Lists */}
      <div className="animate-fade-in-up delay-100">
        <TableTopLists
          sizeRanking={sizeRanking}
          rowsRanking={rowsRanking}
          loading={rankingLoading}
        />
      </div>

      {/* Table Card */}
      <Card className="border border-slate-200 shadow-sm rounded-xl animate-fade-in-up delay-300">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 bg-slate-50/50 border-b border-slate-100">
          <div>
            <CardTitle className="font-semibold text-slate-700 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              All Tables
            </CardTitle>
            <CardDescription className="text-slate-400 text-[11px] mt-0.5">
              {totalCount > 0 ? `${totalCount.toLocaleString()} tables total` : "Loading..."}
            </CardDescription>
          </div>
          <div className="relative w-56 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by table name..."
              className="pl-8 h-8 text-xs bg-white border-slate-200 focus:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Project</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Dataset</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Table</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Last Modified</TableHead>
                <TableHead className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Size</TableHead>
                <TableHead className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Rows Written</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">Write Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j} className="px-4 py-2">
                        <div className="h-3 rounded bg-slate-100 animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No tables found
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((row, idx) => (
                  <TableRow
                    key={`${row.project}.${row.dataset}.${row.table}-${idx}`}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <TableCell className="text-slate-500 text-xs px-4 py-2">{row.project}</TableCell>
                    <TableCell className="text-slate-500 text-xs px-4 py-2">{row.dataset}</TableCell>
                    <TableCell className="font-semibold text-slate-900 px-4 py-2 font-mono text-xs">
                      {row.table}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs px-4 py-2 whitespace-nowrap tabular-nums">
                      {formatDateTime(row.lastModified)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-700 font-medium px-4 py-2 tabular-nums">
                      {formatBytes(row.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-700 font-medium px-4 py-2 tabular-nums">
                      {formatRows(row.rowsWritten)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <WriteModeCell mode={row.writeMode} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-4 py-2.5">
            <span className="text-xs text-slate-500">
              {rangeStart}–{rangeEnd} of {totalCount.toLocaleString()} tables
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={cn(
                    "w-7 h-7 text-xs rounded border transition-colors",
                    currentPage === page
                      ? "bg-blue-600 text-white font-bold border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

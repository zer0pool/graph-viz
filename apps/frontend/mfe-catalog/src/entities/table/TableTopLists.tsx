import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, HardDrive, BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/card";
import { cn } from "../../shared/lib/utils";
import { TableRankingItem } from "../../shared/api/types/lineage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes >= 1_099_511_627_776) return `${(bytes / 1_099_511_627_776).toFixed(1)} TB`;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatRows(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

// ---------------------------------------------------------------------------
// Sparkline — identical pattern to JobTopLists
// ---------------------------------------------------------------------------

const SPARKLINE_SLOTS = 7;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const H = 20;
  const GAP = 2;
  const viewW = 200;
  const barW = Math.floor((viewW - GAP * (SPARKLINE_SLOTS - 1)) / SPARKLINE_SLOTS);

  const padded: (number | null)[] = Array.from({ length: SPARKLINE_SLOTS }, (_, i) => {
    const offset = SPARKLINE_SLOTS - values.length;
    return i >= offset ? values[i - offset] : null;
  });

  const max = Math.max(...values, 1);

  return (
    <svg
      viewBox={`0 0 ${viewW} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      className="block w-full"
    >
      {padded.map((v, i) => {
        const x = i * (barW + GAP);
        if (v === null) {
          return <rect key={i} x={x} y={H - 2} width={barW} height={2} rx={1} fill={`${color}20`} />;
        }
        const barH = Math.max(2, Math.round((v / max) * (H - 2)));
        const isLast = i === SPARKLINE_SLOTS - 1;
        return (
          <rect
            key={i}
            x={x} y={H - barH}
            width={barW} height={barH}
            rx={1}
            fill={isLast ? color : `${color}66`}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Trend badge
// ---------------------------------------------------------------------------

function TrendBadge({ changePct }: { changePct: number }) {
  const abs = Math.abs(changePct).toFixed(1);
  if (changePct > 1)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
        <TrendingUp className="w-3 h-3" />+{abs}%
      </span>
    );
  if (changePct < -1)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500">
        <TrendingDown className="w-3 h-3" />{abs}%
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
      <Minus className="w-3 h-3" />flat
    </span>
  );
}

// ---------------------------------------------------------------------------
// Limit selector
// ---------------------------------------------------------------------------

const LIMIT_OPTIONS = [5, 10, 30];

function LimitSelector({ limit, onChange }: { limit: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
      {LIMIT_OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
            limit === opt
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-6 h-3 bg-slate-200 rounded flex-shrink-0" />
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        <div className="h-3 bg-slate-200 rounded w-2/5" />
        <div className="h-4 bg-slate-100 rounded w-12 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-14 h-4 bg-slate-100 rounded" />
        <div className="w-16 h-4 bg-slate-50 rounded" />
        <div className="w-24 h-4 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

function SkeletonCard({
  icon,
  iconBg,
  title,
  rowCount,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  rowCount: number;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", iconBg)}>{icon}</div>
            <div>
              <CardTitle className="text-lg text-slate-800">{title}</CardTitle>
              <CardDescription className="text-[11px] font-medium text-slate-500">
                Ranked by yesterday · % change vs 7d avg
              </CardDescription>
            </div>
          </div>
          <div className="h-7 w-24 bg-slate-100 rounded-lg border border-slate-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 pt-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ranking row
// ---------------------------------------------------------------------------

function RankingRow({
  item,
  index,
  formatValue,
  sparkColor,
}: {
  item: TableRankingItem;
  index: number;
  formatValue: (v: number) => string;
  sparkColor: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-slate-400 font-medium w-6 flex-shrink-0 text-right">
        #{index + 1}
      </span>

      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <span className="font-semibold text-slate-700 truncate font-mono" title={item.tableId}>
          {item.table}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 flex-shrink-0 truncate max-w-[80px]">
          {item.dataset}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-14 h-5 flex items-center">
          <Sparkline values={item.history7d} color={sparkColor} />
        </div>
        <div className="w-16 flex justify-end">
          <TrendBadge changePct={item.changePct} />
        </div>
        <div className="w-24 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
          {formatValue(item.valueYesterday)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props & main component
// ---------------------------------------------------------------------------

interface TableTopListsProps {
  sizeRanking: TableRankingItem[];
  rowsRanking: TableRankingItem[];
  loading?: boolean;
}

export function TableTopLists({
  sizeRanking = [],
  rowsRanking = [],
  loading = false,
}: Partial<TableTopListsProps> = {}) {
  const [limit, setLimit] = useState<number>(5);

  if (loading && sizeRanking.length === 0 && rowsRanking.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard
          icon={<HardDrive className="h-4 w-4 text-indigo-600" />}
          iconBg="bg-indigo-50"
          title={`Top ${limit} Tables by Size`}
          rowCount={limit}
        />
        <SkeletonCard
          icon={<BarChart2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          title={`Top ${limit} Tables by Rows Written`}
          rowCount={limit}
        />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Top by Size ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <HardDrive className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Top {limit} Tables by Size
                </CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-400">
                  Ranked by yesterday · % change vs 7d avg
                </CardDescription>
              </div>
            </div>
            <LimitSelector limit={limit} onChange={setLimit} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-3">
            {sizeRanking.slice(0, limit).map((item, i) => (
              <RankingRow
                key={item.tableId}
                item={item}
                index={i}
                formatValue={formatBytes}
                sparkColor="#6366f1"
              />
            ))}
            {sizeRanking.length === 0 && !loading && (
              <p className="text-center text-xs text-slate-400 py-3">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Top by Rows Written ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <BarChart2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Top {limit} Tables by Rows Written
                </CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-400">
                  Ranked by yesterday · % change vs 7d avg
                </CardDescription>
              </div>
            </div>
            <LimitSelector limit={limit} onChange={setLimit} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-3">
            {rowsRanking.slice(0, limit).map((item, i) => (
              <RankingRow
                key={item.tableId}
                item={item}
                index={i}
                formatValue={formatRows}
                sparkColor="#10b981"
              />
            ))}
            {rowsRanking.length === 0 && !loading && (
              <p className="text-center text-xs text-slate-400 py-3">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
}

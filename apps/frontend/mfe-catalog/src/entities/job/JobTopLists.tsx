import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/card";
import { cn } from "../../shared/lib/utils";
import { JobRankingItem } from "./job";



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSlot(v: number): string {
  let val = "";
  if (v >= 1_000_000) val = `${(v / 1_000_000).toFixed(1)}M`;
  else if (v >= 1_000) val = `${(v / 1_000).toFixed(0)}K`;
  else val = String(v);
  return `${val} Slots`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function shortJobName(jobId: string): string {
  return jobId.split("-").pop() ?? jobId;
}

function shortProjectName(jobId: string): string {
  return jobId.split("-")[0] ?? jobId;
}

// ---------------------------------------------------------------------------
// Sparkline — simple inline SVG bar chart
// ---------------------------------------------------------------------------

const SPARKLINE_SLOTS = 7; // fixed slot count — spacing is always based on 7 bars

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const H = 20;
  const GAP = 2;
  const viewW = 200;
  // Bar width is always calculated for SPARKLINE_SLOTS, regardless of actual data length
  const barW = Math.floor((viewW - GAP * (SPARKLINE_SLOTS - 1)) / SPARKLINE_SLOTS);

  // Left-pad to SPARKLINE_SLOTS: older slots that have no data become null (ghost bar)
  const padded: (number | null)[] = Array.from({ length: SPARKLINE_SLOTS }, (_, i) => {
    const offset = SPARKLINE_SLOTS - values.length;
    return i >= offset ? values[i - offset] : null;
  });

  const max = Math.max(...values, 1);

  return (
    <svg
      data-testid="sparkline"
      viewBox={`0 0 ${viewW} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      className="block w-full"
    >
      {padded.map((v, i) => {
        const x = i * (barW + GAP);
        if (v === null) {
          // Ghost bar for missing data — same position/width, minimal height, very faint
          return (
            <rect key={i} x={x} y={H - 2} width={barW} height={2} rx={1} fill={`${color}20`} />
          );
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

function LimitSelector({
  limit,
  onChange,
}: {
  limit: number;
  onChange: (v: number) => void;
}) {
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
// Skeleton row — same visual footprint as RankingRow
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      {/* Rank */}
      <div className="w-6 h-3 bg-slate-200 rounded flex-shrink-0" />
      
      {/* Job name + badge */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        <div className="h-3 bg-slate-200 rounded w-2/5" />
        <div className="h-4 bg-slate-100 rounded w-12 flex-shrink-0" />
      </div>

      {/* Right columns */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Sparkline column */}
        <div className="w-14 h-4 bg-slate-100 rounded" />
        
        {/* Trend column */}
        <div className="w-16 h-4 bg-slate-50 rounded" />
        
        {/* Value column */}
        <div className="w-24 h-4 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card — same structure as the real card
// ---------------------------------------------------------------------------

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
      <CardHeader className="p-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", iconBg)}>{icon}</div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
              <CardDescription className="text-[11px] font-medium text-slate-400">
                Ranked by yesterday · % change vs 7d avg
              </CardDescription>
            </div>
          </div>
          {/* Limit selector skeleton */}
          <div className="h-7 w-24 bg-slate-100 rounded-lg border border-slate-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3 p-3">
          {Array.from({ length: rowCount }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single ranking row — compact inline sparkline on the right
// ---------------------------------------------------------------------------

function RankingRow({
  item,
  index,
  formatValue,
  sparkColor,
}: {
  item: JobRankingItem;
  index: number;
  formatValue: (v: number) => string;
  sparkColor: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Rank - fixed width */}
      <span className="text-slate-400 font-medium w-6 flex-shrink-0 text-right">
        #{index + 1}
      </span>

      {/* Job name + project badge — fills remaining space, truncates */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <span className="font-semibold text-slate-700 truncate" title={item.jobId}>
          {shortJobName(item.jobId)}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 flex-shrink-0">
          {shortProjectName(item.jobId)}
        </span>
      </div>

      {/* Right columns - grouped for consistent alignment */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Sparkline column - fixed width */}
        <div className="w-14 h-5 flex items-center">
          <Sparkline values={item.history7d} color={sparkColor} />
        </div>

        {/* Trend column - fixed width ensures vertical alignment of % */}
        <div className="w-16 flex justify-end">
          <TrendBadge changePct={item.changePct} />
        </div>

        {/* Value column - fixed width and right alignment */}
        <div className="w-24 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
          {formatValue(item.valueYesterday)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JobTopListsProps {
  slotRanking: JobRankingItem[];
  durationRanking: JobRankingItem[];
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JobTopLists({
  slotRanking = [],
  durationRanking = [],
  loading = false,
}: Partial<JobTopListsProps> = {}) {
  const [limit, setLimit] = useState<number>(5);

  if (loading && slotRanking.length === 0 && durationRanking.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard
            icon={<Cpu className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50"
            title={`Top ${limit} Jobs by Slot Usage`}
            rowCount={limit}
          />
          <SkeletonCard
            icon={<Clock className="h-4 w-4 text-orange-600" />}
            iconBg="bg-orange-50"
            title={`Top ${limit} Long Running Jobs`}
            rowCount={limit}
          />
        </div>
      </div>
    );
  }

  const slotItems = slotRanking.slice(0, limit);
  const durationItems = durationRanking.slice(0, limit);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Top Slot Usage ── */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Top {limit} Jobs by Slot Usage
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
              {slotItems.map((item, i) => (
                <RankingRow
                  key={item.jobId}
                  item={item}
                  index={i}
                  formatValue={formatSlot}
                  sparkColor="#3b82f6"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Top Long Running ── */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Top {limit} Long Running Jobs
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
              {durationItems.map((item, i) => (
                <RankingRow
                  key={item.jobId}
                  item={item}
                  index={i}
                  formatValue={formatDuration}
                  sparkColor="#f97316"
                />
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/card";
import { cn } from "../../shared/lib/utils";
import { JobRankingItem } from "../../widgets/job-landing/useJobLanding";

// ---------------------------------------------------------------------------
// Mock data (fallback when no real data is available after load)
// ---------------------------------------------------------------------------

function makeMockHistory(base: number): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const seed = (base * (i + 1)) % 31;
    return Math.round(base * (1 + (seed - 15) / 100));
  });
}

const MOCK_SLOT_RANKING: JobRankingItem[] = [
  { jobId: "ml-platform.SELF-TYPE_L2_JOB_003",       type: "SELF-TYPE",    valueYesterday: 720000, value7dAvg: 695000, changePct: 3.6,  history7d: makeMockHistory(695000) },
  { jobId: "fraud-detection.SELF-TYPE_L2_JOB_007",   type: "SELF-TYPE",    valueYesterday: 610000, value7dAvg: 630000, changePct: -3.2, history7d: makeMockHistory(630000) },
  { jobId: "payment-gateway.REQUEST-TYPE_L1_JOB_003",type: "REQUEST-TYPE", valueYesterday: 540000, value7dAvg: 520000, changePct: 3.8,  history7d: makeMockHistory(520000) },
  { jobId: "realtime.REQUEST-TYPE_L1_JOB_013",       type: "REQUEST-TYPE", valueYesterday: 480000, value7dAvg: 475000, changePct: 1.1,  history7d: makeMockHistory(475000) },
  { jobId: "supply-chain.SELF-TYPE_L2_JOB_013",      type: "SELF-TYPE",    valueYesterday: 410000, value7dAvg: 420000, changePct: -2.4, history7d: makeMockHistory(420000) },
  { jobId: "recommendation.REQUEST-TYPE_L2_JOB_014", type: "REQUEST-TYPE", valueYesterday: 370000, value7dAvg: 355000, changePct: 4.2,  history7d: makeMockHistory(355000) },
  { jobId: "search-indexer.REQUEST-TYPE_L1_JOB_005", type: "REQUEST-TYPE", valueYesterday: 320000, value7dAvg: 318000, changePct: 0.6,  history7d: makeMockHistory(318000) },
  { jobId: "ecommerce.SELF-TYPE_L1_JOB_002",         type: "SELF-TYPE",    valueYesterday: 290000, value7dAvg: 295000, changePct: -1.7, history7d: makeMockHistory(295000) },
  { jobId: "reporting.SELF-TYPE_L2_JOB_005",         type: "SELF-TYPE",    valueYesterday: 240000, value7dAvg: 238000, changePct: 0.8,  history7d: makeMockHistory(238000) },
  { jobId: "cdn-analytics.REQUEST-TYPE_L2_JOB_007",  type: "REQUEST-TYPE", valueYesterday: 195000, value7dAvg: 200000, changePct: -2.5, history7d: makeMockHistory(200000) },
];

const MOCK_DURATION_RANKING: JobRankingItem[] = [
  { jobId: "ml-platform.SELF-TYPE_L2_JOB_003",       type: "SELF-TYPE",    valueYesterday: 10200, value7dAvg: 9900,  changePct: 3.0,  history7d: makeMockHistory(9900)  },
  { jobId: "supply-chain.SELF-TYPE_L2_JOB_013",      type: "SELF-TYPE",    valueYesterday: 9100,  value7dAvg: 9300,  changePct: -2.2, history7d: makeMockHistory(9300)  },
  { jobId: "recommendation.REQUEST-TYPE_L2_JOB_014", type: "REQUEST-TYPE", valueYesterday: 8400,  value7dAvg: 8100,  changePct: 3.7,  history7d: makeMockHistory(8100)  },
  { jobId: "fraud-detection.SELF-TYPE_L2_JOB_007",   type: "SELF-TYPE",    valueYesterday: 7600,  value7dAvg: 7800,  changePct: -2.6, history7d: makeMockHistory(7800)  },
  { jobId: "realtime.REQUEST-TYPE_L1_JOB_013",       type: "REQUEST-TYPE", valueYesterday: 6900,  value7dAvg: 6750,  changePct: 2.2,  history7d: makeMockHistory(6750)  },
  { jobId: "payment-gateway.REQUEST-TYPE_L1_JOB_003",type: "REQUEST-TYPE", valueYesterday: 5800,  value7dAvg: 5900,  changePct: -1.7, history7d: makeMockHistory(5900)  },
  { jobId: "reporting.SELF-TYPE_L2_JOB_005",         type: "SELF-TYPE",    valueYesterday: 4900,  value7dAvg: 4800,  changePct: 2.1,  history7d: makeMockHistory(4800)  },
  { jobId: "ecommerce.SELF-TYPE_L1_JOB_002",         type: "SELF-TYPE",    valueYesterday: 4200,  value7dAvg: 4250,  changePct: -1.2, history7d: makeMockHistory(4250)  },
  { jobId: "cdn-analytics.REQUEST-TYPE_L2_JOB_007",  type: "REQUEST-TYPE", valueYesterday: 3500,  value7dAvg: 3400,  changePct: 2.9,  history7d: makeMockHistory(3400)  },
  { jobId: "search-indexer.REQUEST-TYPE_L1_JOB_005", type: "REQUEST-TYPE", valueYesterday: 2900,  value7dAvg: 2950,  changePct: -1.7, history7d: makeMockHistory(2950)  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSlot(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function shortJobName(jobId: string): string {
  return jobId.split(".").pop() ?? jobId;
}

function shortProjectName(jobId: string): string {
  return jobId.split(".")[0] ?? jobId;
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
    <div className="flex items-center gap-2 animate-pulse">
      <div className="w-5 h-3 bg-slate-200 rounded flex-shrink-0" />
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="h-3 bg-slate-200 rounded w-2/5" />
        <div className="h-4 bg-slate-100 rounded w-14 flex-shrink-0" />
      </div>
      <div className="w-14 h-5 bg-slate-100 rounded flex-shrink-0" />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="h-3 bg-slate-200 rounded w-10" />
        <div className="h-3 bg-slate-200 rounded w-14" />
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
          {/* Limit selector skeleton */}
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
    <div className="flex items-center gap-2 text-xs">
      {/* Rank */}
      <span className="text-slate-400 font-medium w-5 flex-shrink-0">#{index + 1}</span>

      {/* Job name + project badge — fills remaining space, truncates */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="font-semibold text-slate-700 truncate" title={item.jobId}>
          {shortJobName(item.jobId)}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 flex-shrink-0">
          {shortProjectName(item.jobId)}
        </span>
      </div>

      {/* Compact inline sparkline */}
      <div className="w-14 h-5 flex-shrink-0">
        <Sparkline values={item.history7d} color={sparkColor} />
      </div>

      {/* Trend badge + value */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <TrendBadge changePct={item.changePct} />
        <span className="font-mono font-bold text-slate-800 w-14 text-right">
          {formatValue(item.valueYesterday)}
        </span>
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
  slotRanking = MOCK_SLOT_RANKING,
  durationRanking = MOCK_DURATION_RANKING,
  loading = false,
}: Partial<JobTopListsProps> = {}) {
  const [limit, setLimit] = useState<number>(5);

  if (loading && slotRanking.length === 0 && durationRanking.length === 0) {
    return (
      <div className="space-y-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Top Slot Usage ── */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-800">
                    Top {limit} Jobs by Slot Usage
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500">
                    Ranked by yesterday · % change vs 7d avg
                  </CardDescription>
                </div>
              </div>
              <LimitSelector limit={limit} onChange={setLimit} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-800">
                    Top {limit} Long Running Jobs
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500">
                    Ranked by yesterday · % change vs 7d avg
                  </CardDescription>
                </div>
              </div>
              <LimitSelector limit={limit} onChange={setLimit} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
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

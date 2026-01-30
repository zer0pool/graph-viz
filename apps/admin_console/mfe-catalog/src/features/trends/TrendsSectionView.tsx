import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";

interface TrendsSectionViewProps {
  totalTables: number;
  totalSize: number;
  totalDelayed: number;
  totalExpiring: number;
  slaBreach: number;
  tablesTrend: any[];
  storageTrend: any[];
  issuesTrend: any[];
}

export function TrendsSectionView({
  totalTables,
  totalSize,
  totalDelayed,
  totalExpiring,
  slaBreach,
  tablesTrend,
  storageTrend,
  issuesTrend,
}: TrendsSectionViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trends (Last 30 Days)</CardTitle>
        <CardDescription>
          Historical data for tables, storage, and issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables Count Trend */}
          <div className="space-y-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Tables Count
            </h4>
            <div className="h-[120px] w-full bg-slate-50/50 rounded-lg border border-slate-100/50">
              <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                <LineChart data={tablesTrend || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tables"
                    stroke="#1a73e8"
                    strokeWidth={3}
                    dot={false}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground font-medium italic">Started: 1,420</span>
              <span className="font-bold text-primary">
                Current: {totalTables.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Storage Size Trend */}
          <div className="space-y-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Storage Size (TB)
            </h4>
            <div className="h-[120px] w-full bg-slate-50/50 rounded-lg border border-slate-100/50">
              <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                <LineChart data={storageTrend || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="size"
                    stroke="#34a853"
                    strokeWidth={3}
                    dot={false}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground font-medium italic">Started: 135.2 TB</span>
              <span className="font-bold text-green-600">
                Current: {totalSize.toFixed(1)} TB
              </span>
            </div>
          </div>

          {/* Issues Trend */}
          <div className="space-y-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Issues Breakdown
            </h4>
            <div className="h-[120px] w-full bg-slate-50/50 rounded-lg border border-slate-100/50">
              <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                <LineChart data={issuesTrend || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="delayed"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expiring"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sla"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-700 font-medium">Delay: {totalDelayed}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-yellow-700 font-medium">Expr: {totalExpiring}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-red-700 font-bold">SLA: {slaBreach}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
} from "../../components/ui/card";

// Mock Data
const totalTables = 1548; // Should match with dataset sum in real app
const totalSize = 148.0; // TB
const totalDelayed = 79;
const totalExpiring = 23;
const slaBreach = 3;

const tablesTrend = [
  { day: "Day 1", tables: 1420 },
  { day: "Day 5", tables: 1435 },
  { day: "Day 10", tables: 1458 },
  { day: "Day 15", tables: 1482 },
  { day: "Day 20", tables: 1510 },
  { day: "Day 25", tables: 1548 },
  { day: "Day 30", tables: totalTables },
];

const storageTrend = [
  { day: "Day 1", size: 135.2 },
  { day: "Day 5", size: 136.8 },
  { day: "Day 10", size: 138.1 },
  { day: "Day 15", size: 139.5 },
  { day: "Day 20", size: 140.8 },
  { day: "Day 25", size: 141.6 },
  { day: "Day 30", size: totalSize },
];

const issuesTrend = [
  { day: "Day 1", delayed: 45, expiring: 18, sla: 3 },
  { day: "Day 5", delayed: 52, expiring: 15, sla: 4 },
  { day: "Day 10", delayed: 58, expiring: 20, sla: 2 },
  { day: "Day 15", delayed: 62, expiring: 22, sla: 3 },
  { day: "Day 20", delayed: 68, expiring: 19, sla: 1 },
  { day: "Day 25", delayed: 72, expiring: 21, sla: 2 },
  {
    day: "Day 30",
    delayed: totalDelayed,
    expiring: totalExpiring,
    sla: slaBreach,
  },
];

export function TrendsSection() {
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
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tables Count</h4>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tablesTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tables"
                    stroke="#1a73e8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Started: 1,420</span>
              <span className="font-medium">
                Current: {totalTables.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Storage Size Trend */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Storage Size (TB)</h4>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={storageTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="size"
                    stroke="#34a853"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Started: 135.2 TB</span>
              <span className="font-medium">
                Current: {totalSize.toFixed(1)} TB
              </span>
            </div>
          </div>

          {/* Issues Trend */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Issues (Delayed / Expiring / SLA)
            </h4>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={issuesTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
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
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-3">
                <span className="text-orange-500">Delayed: {totalDelayed}</span>
                <span className="text-yellow-500">
                  Expiring: {totalExpiring}
                </span>
                <span className="text-red-500">SLA: {slaBreach}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

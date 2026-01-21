import React from "react";
import ReactECharts from "echarts-for-react";
import { JobRun } from "../../types/job";
import { formatDuration } from "../../utils";

interface JobRunTimelineProps {
  runs: JobRun[];
  onRunSelect?: (run: JobRun) => void;
}

export const JobRunTimeline: React.FC<JobRunTimelineProps> = ({
  runs,
  onRunSelect,
}) => {
  const sortedRuns = [...runs].sort((a, b) => {
    const tA = new Date(a.start_time).getTime() || 0;
    const tB = new Date(b.start_time).getTime() || 0;
    return tA - tB;
  });

  const COLORS = {
    SUCCESS: "#188038",
    FAILED: "#C5221F",
    RUNNING: "#1a73e8",
    UNKNOWN: "#E5E7EB",
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (/success|completed|done/.test(s)) return COLORS.SUCCESS;
    if (/failed|error|cancelled/.test(s)) return COLORS.FAILED;
    if (/running|pending|queued/.test(s)) return COLORS.RUNNING;
    return COLORS.UNKNOWN;
  };

  const option = {
    grid: { top: 5, bottom: 5, left: 0, right: 0 },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const run = params.data.data;
        return `
          <div style="font-size:12px; font-weight:600;">RUN ID: ${
            run.run_id
          }</div>
          <div style="font-size:11px;">Status: <span style="color:${
            params.color
          }">${run.status}</span></div>
          <div style="font-size:11px;">Start: ${run.start_time}</div>
          <div style="font-size:11px;">Duration: ${formatDuration(
            run.duration
          )}</div>
        `;
      },
    },
    xAxis: { type: "category", show: false, data: sortedRuns.map((_, i) => i) },
    yAxis: { type: "value", show: false, max: 1 },
    series: [
      {
        type: "bar",
        data: sortedRuns.map((run, idx) => ({
          value: 1,
          itemStyle: { color: getStatusColor(run.status) },
          data: run,
        })),
        barWidth: "90%",
      },
    ],
  };

  return (
    <div className="mb-6">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
        Run Status
      </div>
      <ReactECharts
        option={option}
        style={{ height: "40px", width: "100%" }}
        onEvents={{
          click: (params: any) => {
            if (params.data && params.data.data)
              onRunSelect?.(params.data.data);
          },
        }}
      />
    </div>
  );
};

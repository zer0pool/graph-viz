import React from "react";
import ReactECharts from "echarts-for-react";
import { JobRun } from "../../shared/types/job";
import { formatDuration } from "../../shared/lib/utils";

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
    SUCCESS: "#1e8e3e", // GCP Dark Green
    FAILED: "#d93025",  // GCP Dark Red
    RUNNING: "#1a73e8", // GCP Blue
    UNKNOWN: "#e8eaed", // GCP Grey
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (/success|completed|done/.test(s)) return COLORS.SUCCESS;
    if (/failed|error|cancelled/.test(s)) return COLORS.FAILED;
    if (/running|pending|queued/.test(s)) return COLORS.RUNNING;
    return COLORS.UNKNOWN;
  };

  const option = {
    grid: { top: 0, bottom: 0, left: 0, right: 0 },
    tooltip: {
      trigger: "item",
      renderMode: "html",
      appendToBody: true,
      backgroundColor: "rgba(32, 33, 36, 0.95)",
      borderColor: "#3c4043",
      textStyle: { color: "#fff" },
      extraCssText: "z-index: 100000; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);",
      formatter: (params: any) => {
        const run = params.data.data;
        return `
          <div style="font-size:11px; font-weight:700; color:#fff; margin-bottom:4px;">RUN ID: ${run.run_id}</div>
          <div style="font-size:10px; color:#bdc1c6;">Status: <span style="color:${params.color}; font-weight:700;">${run.status}</span></div>
          <div style="font-size:10px; color:#bdc1c6;">Start: ${run.start_time}</div>
          <div style="font-size:10px; color:#bdc1c6;">Duration: ${formatDuration(run.duration || (run as any).duration_sec)}</div>
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
        barWidth: "100%",
        barGap: "0%",
        barCategoryGap: "0%",
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

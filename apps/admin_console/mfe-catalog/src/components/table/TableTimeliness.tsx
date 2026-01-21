import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { TableTimelinessData } from "../../types/table";
import { formatNumber, formatDuration } from "../../utils";

interface TableTimelinessProps {
  history: TableTimelinessData[];
  loading?: boolean;
}

export const TableTimeliness: React.FC<TableTimelinessProps> = ({
  history,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center animate-pulse">
        <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              Analyzing Trends...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-gray-100 rounded-2xl mx-1">
        <div className="text-4xl mb-4">📈</div>
        <h4 className="text-gray-900 font-bold mb-1 uppercase tracking-widest text-xs">
          No Activity Data
        </h4>
        <p className="text-gray-400 text-sm italic">
          Timeliness and row count trends are not available for this period.
        </p>
      </div>
    );
  }

  const option = useMemo(() => {
    const dates = history.map((h) =>
      new Date(h.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
    const rowCounts = history.map((h) => h.row_count);
    const lags = history.map((h) => h.data_freshness_lag || 0);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#e5e7eb", width: 1 },
        },
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderColor: "#f3f4f6",
        borderWidth: 1,
        padding: [10, 15],
        textStyle: { color: "#111827", fontSize: 12 },
        formatter: (params: any) => {
          let html = `<div class="font-bold text-xs uppercase tracking-wider mb-2 text-gray-500">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val =
              p.seriesName === "Freshness Lag"
                ? formatDuration(p.value)
                : formatNumber(p.value);
            html += `
              <div class="flex items-center justify-between gap-8 mb-1">
                <div class="flex items-center">
                  <span class="w-2 h-2 rounded-full mr-2" style="background-color: ${p.color}"></span>
                  <span class="text-xs text-gray-600">${p.seriesName}</span>
                </div>
                <span class="text-xs font-black">${val}</span>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: "#6b7280",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
        },
      },
      grid: {
        top: "10%",
        left: "2%",
        right: "5%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: { color: "#9ca3af", fontSize: 10, margin: 15 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: "value",
          name: "ROWS",
          nameTextStyle: {
            color: "#9ca3af",
            fontSize: 9,
            fontWeight: 800,
            padding: [0, 0, 10, 0],
          },
          splitLine: { lineStyle: { color: "#f9fafb", type: "dashed" } },
          axisLabel: { color: "#9ca3af", fontSize: 10 },
        },
        {
          type: "value",
          name: "LAG",
          nameTextStyle: {
            color: "#9ca3af",
            fontSize: 9,
            fontWeight: 800,
            padding: [0, 0, 10, 0],
          },
          splitLine: { show: false },
          axisLabel: { color: "#9ca3af", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Row Count",
          type: "line",
          data: rowCounts,
          smooth: 0.3,
          showSymbol: false,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.1)" },
                { offset: 1, color: "rgba(59, 130, 246, 0)" },
              ],
            },
          },
        },
        {
          name: "Freshness Lag",
          type: "bar",
          yAxisIndex: 1,
          data: lags,
          itemStyle: {
            color: "#10b981",
            borderRadius: [4, 4, 0, 0],
            opacity: 0.6,
          },
          barWidth: "30%",
        },
      ],
    };
  }, [history]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Volume & Freshness Trends
        </h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-[10px] font-bold text-gray-500">ROWS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 opacity-60"></span>
            <span className="text-[10px] font-bold text-gray-500">LAG</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <ReactECharts
          option={option}
          style={{ height: "350px", width: "100%" }}
        />
      </div>
    </div>
  );
};

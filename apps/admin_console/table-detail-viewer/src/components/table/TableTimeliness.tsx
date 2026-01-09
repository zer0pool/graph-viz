import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { TableTimelinessData } from "../../types/table";

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
      <div className="h-64 flex items-center justify-center text-gray-500">
        Loading timeline...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No timeline data available.
      </div>
    );
  }

  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: {
        data: ["Row Count", "Freshness Lag (s)"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: history.map((h) => new Date(h.timestamp).toLocaleDateString()),
      },
      yAxis: [
        {
          type: "value",
          name: "Row Count",
          position: "left",
          axisLine: { show: true, lineStyle: { color: "#5470C6" } },
        },
        {
          type: "value",
          name: "Lag (s)",
          position: "right",
          axisLine: { show: true, lineStyle: { color: "#91CC75" } },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Row Count",
          type: "line",
          data: history.map((h) => h.row_count),
          smooth: true,
          itemStyle: { color: "#5470C6" },
        },
        {
          name: "Freshness Lag (s)",
          type: "line",
          yAxisIndex: 1,
          data: history.map((h) => h.data_freshness_lag),
          smooth: true,
          areaStyle: { opacity: 0.1 },
          itemStyle: { color: "#91CC75" },
        },
      ],
    };
  }, [history]);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100">
      <ReactECharts option={option} style={{ height: "350px" }} />
    </div>
  );
};

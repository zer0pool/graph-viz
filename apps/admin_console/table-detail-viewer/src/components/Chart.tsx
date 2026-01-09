import React from "react";
import ReactECharts from "echarts-for-react";

// Generic ECharts wrapper to ensure consistent styling and lazy loading behavior if needed.
// Phase 4 task: Port ECharts. The TableTimeliness component already implemented a specific chart.
// This generic one can be used for "JobRunTimeline".

interface SimpleChartProps {
  options: any;
  height?: string;
  loading?: boolean;
}

export const Chart: React.FC<SimpleChartProps> = ({
  options,
  height = "300px",
  loading,
}) => {
  if (loading)
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-gray-400"
      >
        Loading Chart...
      </div>
    );

  return (
    <ReactECharts
      option={options}
      style={{ height, width: "100%" }}
      opts={{ renderer: "svg" }} // Use SVG for better scaling
    />
  );
};

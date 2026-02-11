import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { TableTimelinessResponse, TableTimelinessData } from "../../shared/types/table";

interface TableTimelinessProps {
  data: TableTimelinessResponse | null;
  loading?: boolean;
  tableName: string;
  days: number;
  onDaysChange: (days: number) => void;
}

const STATE_COLORS: Record<string, string> = {
  success: "#1e8e3e", // GCP Green
  good: "#1e8e3e",
  failed: "#d93025", // GCP Red
  bad: "#d93025",
  warning: "#f9ab00", // GCP Yellow/Orange
  missing: "#f1f3f4", // Light Gray
  loaded: "#1e8e3e", // From Hourly state
  unknown: "#f1f3f4",
};

export const TableTimeliness: React.FC<TableTimelinessProps> = ({
  data,
  loading,
  days,
  onDaysChange,
}) => {
  // 1. All hooks must be at the top level
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const dailyHistory = data?.daily_summary || [];

  useEffect(() => {
    // Select last day by default if available
    if (dailyHistory.length > 0 && !selectedDay) {
      setSelectedDay(dailyHistory[dailyHistory.length - 1].date);
    }
  }, [dailyHistory, selectedDay]);

  // Process Daily Data
  const dailyOption = useMemo(() => {
    if (dailyHistory.length === 0) return null;
    const dates = dailyHistory.map(h => h.date);
    const chartData = dailyHistory.map(h => {
      const status = h.status;
      return {
        value: 1,
        itemStyle: {
          color: STATE_COLORS[status] || STATE_COLORS.unknown,
          borderRadius: [4, 4, 4, 4] as any,
        },
        payload: h
      };
    });

    return {
      grid: { top: 10, bottom: 40, left: 10, right: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: "#dadce0" } },
        axisLabel: { 
          color: "#5f6368", 
          fontSize: 10,
          rotate: dailyHistory.length > 10 ? 45 : 0
        },
      },
      yAxis: { show: false },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const d = params.data.payload as TableTimelinessData;
          return `Date: ${d.date}<br/>Success: ${d.success_count}<br/>Status: <b>${d.status.toUpperCase()}</b>`;
        }
      },
      series: [{
        type: "bar",
        data: chartData,
        barWidth: "60%",
        cursor: "pointer",
      }]
    };
  }, [dailyHistory]);

  // Use hourly data for selected day from response
  const hourlyRows = useMemo(() => {
    if (!selectedDay || !data?.hourly_detail) return [];
    return data.hourly_detail[selectedDay] || [];
  }, [data, selectedDay]);

  const hourlyOption = useMemo(() => {
    if (hourlyRows.length === 0) return null;

    return {
      grid: { top: 10, bottom: 20, left: 0, right: 0, containLabel: false },
      xAxis: {
        type: "category",
        data: hourlyRows.map(d => d.hour),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 9, interval: 2 },
      },
      yAxis: { show: false },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => `Hour: ${params.name}:00<br/>State: ${params.data.state}`
      },
      series: [{
        type: "bar",
        data: hourlyRows.map(d => ({
          value: 1,
          state: d.state,
          itemStyle: { 
            color: STATE_COLORS[d.state] || STATE_COLORS.unknown,
            borderRadius: d.hour === "00" ? [4, 0, 0, 4] : d.hour === "23" ? [0, 4, 4, 0] : 0
          } as any
        })),
        barGap: "0%",
        barCategoryGap: "2%",
      }]
    };
  }, [hourlyRows]);

  const onEvents = useMemo(() => ({
    'click': (params: any) => {
      if (params.data.payload) {
        setSelectedDay(params.data.payload.date);
      }
    }
  }), []);

  // 2. Early returns happen AFTER all hooks
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-[#dadce0] animate-pulse">
        <div className="w-full h-48 bg-[#f8f9fa] rounded-lg mb-8"></div>
        <div className="w-full h-12 bg-[#f8f9fa] rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-lg border border-[#dadce0] p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-[#5f6368] uppercase tracking-widest">Timeliness Overview</h3>
          <div className="flex items-center bg-[#f1f3f4] rounded-lg p-1">
             <button 
                onClick={() => onDaysChange(7)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${days === 7 ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:text-[#202124]'}`}
             >
               7d
             </button>
             <button 
                onClick={() => onDaysChange(14)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${days === 14 ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:text-[#202124]'}`}
             >
               14d
             </button>
          </div>
        </div>
        
        {dailyHistory.length === 0 ? (
          <div className="p-16 text-center bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded-lg">
            <div className="text-4xl mb-4">📈</div>
            <h4 className="text-[#202124] font-medium mb-1 uppercase tracking-widest text-xs">
              No Data Found
            </h4>
            <p className="text-[#5f6368] text-sm">
              No activity records for the last {days} days.
            </p>
          </div>
        ) : (
          <div className="h-48">
            <ReactECharts 
              option={dailyOption} 
              onEvents={onEvents}
              style={{ height: '100%', width: '100%' }} 
            />
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="bg-white rounded-lg border border-[#dadce0] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-[#5f6368] uppercase tracking-widest">Hourly Detail • {selectedDay}</h3>
            <button onClick={() => setSelectedDay(null)} className="text-[#5f6368] hover:text-[#202124] text-xs">✕ Close</button>
          </div>
          
          <div className="h-20">
            {hourlyOption ? (
              <ReactECharts 
                option={hourlyOption} 
                style={{ height: '100%', width: '100%' }} 
              />
            ) : (
                <div className="h-full flex items-center justify-center bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded italic text-xs text-[#5f6368]">
                    No hourly data available for this date.
                </div>
            )}
          </div>
          <div className="mt-6 flex gap-6 text-[10px] font-bold text-[#5f6368] uppercase tracking-wider justify-center">
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#1e8e3e]"></span> Success</div>
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f9ab00]"></span> Warning</div>
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#d93025]"></span> Failed</div>
             <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f1f3f4]"></span> Missing</div>
          </div>
        </div>
      )}
    </div>
  );
};

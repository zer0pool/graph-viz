import React, { ReactNode } from "react";

interface JobLineageLayoutProps {
  header?: ReactNode;
  healthPanel: ReactNode;
  graphPanel: ReactNode;
  inputPanel: ReactNode;
  outputPanel: ReactNode;
}

export const JobLineageLayout: React.FC<JobLineageLayoutProps> = ({
  header,
  healthPanel,
  graphPanel,
  inputPanel,
  outputPanel,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
      {/* 1. Header Area */}
      {header && (
        <div className="flex-none bg-white border-b px-6 py-4 shadow-sm z-10 transition-all duration-300">
          {header}
        </div>
      )}

      {/* 2. Health Metric Panel (Collapsible if needed) */}
      <div className="flex-none px-6 py-4 bg-slate-50/50">
        {healthPanel}
      </div>

      {/* 3. Main Body (Vertical Stack) */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 gap-6 overflow-y-auto">
        {/* Upstream Inputs */}
        <div className="flex-none flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md py-2 px-4">
          <div className="flex-1 overflow-y-auto p-2 max-h-[300px]">
            {inputPanel}
          </div>
        </div>

        {/* Downstream Outputs */}
        <div className="flex-none flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md py-2 px-4">
          <div className="flex-1 overflow-y-auto p-2 max-h-[300px]">
            {outputPanel}
          </div>
        </div>

        {/* Graph (Bottom) */}
        <div className="flex-none bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
          {graphPanel}
        </div>
      </div>
    </div>
  );
};

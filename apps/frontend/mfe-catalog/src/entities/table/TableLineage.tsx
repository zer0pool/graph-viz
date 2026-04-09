import React, { useState } from "react";
import { GitBranch } from "lucide-react";
import { TableLineageSummary } from "../../shared/types/table";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { ImpactAnalysisModal } from "../../features/impact-analysis";

interface TableLineageProps {
  lineage: TableLineageSummary | null;
  loading: boolean;
  tableName: string;
}

export const TableLineage: React.FC<TableLineageProps> = ({ lineage, loading, tableName }) => {
  const navigate = useMfeNavigate();
  const [isImpactOpen, setIsImpactOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#dadce0] p-12 h-64 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#e8f0fe] border-t-[#1a73e8] rounded-full animate-spin"></div>
        <span className="text-sm text-[#5f6368] font-medium tracking-wider uppercase">
          Loading Lineage Data...
        </span>
      </div>
    );
  }

  const metrics = lineage?.metrics;

  return (
    <>
    <div className="flex justify-end mb-4">
      <button
        onClick={() => setIsImpactOpen(true)}
        className="h-8 px-3 flex items-center gap-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <GitBranch className="h-3.5 w-3.5" />
        Impact Analysis
      </button>
    </div>
    <div className="flex flex-col h-full bg-white space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upstream Summary */}
        <div className="bg-white rounded-lg border border-[#dadce0] p-6">
          <div className="mb-6 pb-2 border-b border-[#f1f3f4]">
            <h3 className="text-sm font-medium text-[#202124]">Upstream Summary</h3>
            <p className="text-[10px] text-[#5f6368] uppercase tracking-wider mt-1.5">
              Impact and sources providing data to this table.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-6">
            <MetricItem label="Upstream Tables" value={metrics?.upstream_table_count} />
            <MetricItem label="Producer Jobs" value={metrics?.upstream_job_count} />
            <MetricItem label="Max Depth" value={metrics?.depth.upstream} />
            <MetricItem label="Root Tables" value={metrics?.root_count} />
          </div>
        </div>

        {/* Downstream Summary */}
        <div className="bg-white rounded-lg border border-[#dadce0] p-6">
          <div className="mb-6 pb-2 border-b border-[#f1f3f4]">
            <h3 className="text-sm font-medium text-[#202124]">Downstream Summary</h3>
            <p className="text-[10px] text-[#5f6368] uppercase tracking-wider mt-1.5">
              Impact and consumers reading from this table.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-6">
            <MetricItem label="Downstream Tables" value={metrics?.downstream_table_count} />
            <MetricItem label="Consumer Jobs" value={metrics?.downstream_job_count} />
            <MetricItem label="Max Depth" value={metrics?.depth.downstream} />
            <MetricItem label="Leaf Tables" value={metrics?.leaf_count} />
          </div>
        </div>
      </div>
    </div>

    {isImpactOpen && (
      <ImpactAnalysisModal
        tableName={tableName}
        onClose={() => setIsImpactOpen(false)}
      />
    )}
    </>
  );
};

const MetricItem: React.FC<{ label: string; value?: number }> = ({ label, value = 0 }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-medium text-[#5f6368] uppercase tracking-widest mb-1.5 flex items-center">
      {label}
    </span>
    <span className="text-2xl font-medium text-[#202124]">{value}</span>
  </div>
);

const NodeBox: React.FC<{ type: string; name: string; color?: string }> = ({ name }) => (
  <div
    className={`p-4 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg flex items-center gap-3 hover:shadow-md transition-all cursor-default`}
  >
    <div
      className={`w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#174ea6] shadow-sm uppercase`}
    >
      J
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-[#174ea6] uppercase tracking-widest">
        Job Node
      </span>
      <span className="text-xs font-bold text-[#174ea6] truncate max-w-[120px]">
        {name.split(":").pop()}
      </span>
    </div>
  </div>
);

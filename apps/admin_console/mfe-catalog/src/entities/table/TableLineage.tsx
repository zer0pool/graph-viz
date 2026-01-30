import React from "react";
import { TableLineageSummary } from "../../shared/types/table";
import { useMfeNavigate } from "../../shared/lib/navigation";

interface TableLineageProps {
  lineage: TableLineageSummary | null;
  loading: boolean;
  tableName: string;
}

export const TableLineage: React.FC<TableLineageProps> = ({
  lineage,
  loading,
  tableName,
}) => {
  const navigate = useMfeNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#dadce0] p-12 h-64 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#e8f0fe] border-t-[#1a73e8] rounded-full animate-spin"></div>
        <span className="text-sm text-[#5f6368] font-medium tracking-wider uppercase">Loading Lineage Data...</span>
      </div>
    );
  }

  const metrics = lineage?.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upstream Summary */}
        <div className="bg-white rounded-lg border border-[#dadce0] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#f1f3f4]">
            <span className="text-xl">🏗️</span>
            <div>
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wider">Upstream Summary</h3>
              <p className="text-[10px] text-[#5f6368]">Impact and sources providing data to this table.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-y-8">
            <MetricItem label="Upstream Tables" value={metrics?.upstream_table_count} icon="📊" />
            <MetricItem label="Producer Jobs" value={metrics?.upstream_job_count} icon="⚙️" />
            <MetricItem label="Max Depth" value={metrics?.depth.upstream} icon="📏" />
            <MetricItem label="Root Tables" value={metrics?.root_count} icon="🌳" />
          </div>
        </div>

        {/* Downstream Summary */}
        <div className="bg-white rounded-lg border border-[#dadce0] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#f1f3f4]">
            <span className="text-xl">🚀</span>
            <div>
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wider">Downstream Summary</h3>
              <p className="text-[10px] text-[#5f6368]">Impact and consumers reading from this table.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-y-8">
            <MetricItem label="Downstream Tables" value={metrics?.downstream_table_count} icon="📊" />
            <MetricItem label="Consumer Jobs" value={metrics?.downstream_job_count} icon="⚙️" />
            <MetricItem label="Max Depth" value={metrics?.depth.downstream} icon="📏" />
            <MetricItem label="Leaf Tables" value={metrics?.leaf_count} icon="🍃" />
          </div>
        </div>
      </div>

      <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-lg p-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#e8f0fe] rounded-full flex items-center justify-center text-xl shadow-sm">🕸️</div>
           <div>
             <h4 className="text-sm font-bold text-[#202124]">Interactive Lineage Explorer</h4>
             <p className="text-xs text-[#5f6368]">Open the full graph to navigate through all connected components across the entire workspace.</p>
           </div>
         </div>
         <button 
          onClick={() => navigate(`/lineage/table:${encodeURIComponent(tableName)}`)}
          className="text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1765cc] px-8 py-3 rounded shadow-md transition-all uppercase tracking-widest"
        >
          View Full Graph
        </button>
      </div>
    </div>
  );
};

const MetricItem: React.FC<{ label: string; value?: number; icon: string }> = ({ label, value = 0, icon }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-widest mb-2 flex items-center gap-1.5">
       <span className="opacity-60">{icon}</span> {label}
    </span>
    <span className="text-2xl font-medium text-[#202124]">{value}</span>
  </div>
);

const NodeBox: React.FC<{ type: string; name: string; color?: string }> = ({ name }) => (
  <div className={`p-4 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg flex items-center gap-3 hover:shadow-md transition-all cursor-default`}>
    <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm shadow-sm`}>
      ⚙️
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-[#174ea6] uppercase tracking-widest">Job Node</span>
      <span className="text-xs font-bold text-[#174ea6] truncate max-w-[120px]">
        {name.split(':').pop()}
      </span>
    </div>
  </div>
);

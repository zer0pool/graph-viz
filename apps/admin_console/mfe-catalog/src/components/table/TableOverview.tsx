import React from "react";
import { TableDetail } from "../../types/table";
import { formatBytes, formatNumber, formatDate } from "../../utils";

interface TableOverviewProps {
  table: TableDetail;
  loading?: boolean;
  writerCount?: number;
  readerCount?: number;
}

export const TableOverview: React.FC<TableOverviewProps> = ({
  table,
  loading,
  writerCount = 0,
  readerCount = 0,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f3f4]">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Writers" value={writerCount} icon="✍️" color="blue" />
        <MetricCard label="Readers" value={readerCount} icon="📖" color="green" />
        <MetricCard label="Rows" value={formatNumber(table.storage_info?.row_count)} icon="📊" color="purple" />
        <MetricCard label="Size" value={formatBytes(table.storage_info?.size_bytes)} icon="💾" color="orange" />
      </div>

      <div className="bg-white rounded-lg border border-[#dadce0] p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-lg font-medium text-[#202124]">About</h2>
          <div className="flex gap-2">
             <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors">🔄</button>
             <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors">✏️</button>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <label className="block text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-2">Description</label>
            <p className="text-sm text-[#3c4043] leading-relaxed">
              {table.description || "Experimental BigQuery table for high-performance analytics. Contains historical records and processed metrics."}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
            <InfoItem label="Owner" value={table.owner || "data-team-a"} icon="👥" />
            <InfoItem label="System" value={table.storage_info?.type || "bigquery"} icon="🏗️" />
            <InfoItem label="Type" value="table" icon="📦" />
            <InfoItem label="Location" value={table.storage_info?.location} icon="📍" />
            <InfoItem label="Format" value={table.storage_info?.format} icon="📄" />
            <InfoItem label="Created" value={formatDate(table.created_at)} icon="📅" />
            <InfoItem label="Modified" value={formatDate(table.updated_at || (table as any).modified)} icon="🕒" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-4">Tags</label>
            <div className="flex flex-wrap gap-2">
              {table.tags?.map(tag => (
                <span key={tag} className="px-3 py-1 bg-[#e8f0fe] border border-[#d2e3fc] text-[#1967d2] text-xs font-medium rounded-full">
                  {tag}
                </span>
              )) || (
                <span className="text-sm text-[#5f6368] italic">No tags assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: any; icon: string; color: string }> = ({ label, value, icon }) => (
  <div className="bg-white p-5 rounded-lg border border-[#dadce0] shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">{label}</span>
      <span className="text-lg opacity-80">{icon}</span>
    </div>
    <div className="text-2xl font-medium text-[#202124]">{value ?? "—"}</div>
  </div>
);

const InfoItem: React.FC<{ label: string; value?: string; icon: string }> = ({ label, value, icon }) => (
  <div>
    <label className="block text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-2">{label}</label>
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-50">{icon}</span>
      <span className="text-sm font-medium text-[#202124]">{value || "—"}</span>
    </div>
  </div>
);

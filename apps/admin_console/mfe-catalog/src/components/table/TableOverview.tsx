import React from "react";
import { TableDetail } from "../../types/table";
import { formatBytes, formatNumber, formatDate } from "../../utils";

interface TableOverviewProps {
  table: TableDetail;
  loading?: boolean;
}

export const TableOverview: React.FC<TableOverviewProps> = ({
  table,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  const storage = table.storage_info;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Row Count"
          value={formatNumber(storage?.row_count)}
          color="blue"
          icon="📊"
        />
        <SummaryCard
          label="Storage Size"
          value={formatBytes(storage?.size_bytes)}
          color="purple"
          icon="💾"
        />
        <SummaryCard
          label="Freshness"
          value={formatDate(table.updated_at)}
          color="green"
          icon="⏱️"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                {table.name}
              </h2>
              {storage?.type && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-widest border border-gray-200">
                  {storage.type}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {table.tags && table.tags.length > 0 ? (
                table.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                  No tags available
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-8">
              <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                Description
              </label>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                {table.description || "No description provided for this table."}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <Field label="Owner" value={table.owner} />
              <Field label="Location" value={storage?.location} />
              <Field label="Format" value={storage?.format} />
              <Field label="Created" value={formatDate(table.created_at)} />
            </div>
          </div>
        </div>

        {(storage?.partitioning ||
          (storage?.clustering && storage.clustering.length > 0)) && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Physical Organization
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storage?.partitioning && (
                <div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-xl mr-3">📂</span>
                  <div>
                    <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                      Partitioning
                    </div>
                    <div className="text-sm font-semibold text-amber-900">
                      {storage.partitioning}
                    </div>
                  </div>
                </div>
              )}
              {storage.clustering && storage.clustering.length > 0 && (
                <div className="flex items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <span className="text-xl mr-3">⛓️</span>
                  <div>
                    <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                      Clustering
                    </div>
                    <div className="text-sm font-semibold text-indigo-900">
                      {storage.clustering.join(", ")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  color: "blue" | "purple" | "green";
  icon: string;
}> = ({ label, value, color, icon }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    green: "bg-green-50 text-green-700 border-green-100",
  };
  return (
    <div
      className={`p-4 rounded-xl border ${colors[color]} shadow-sm transition-all hover:shadow-md hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string }> = ({
  label,
  value,
}) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
      {label}
    </label>
    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
      {value || "—"}
    </div>
  </div>
);

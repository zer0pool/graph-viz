import React from "react";
import { TableDetail } from "../../types/table";

interface TableOverviewProps {
  table: TableDetail;
  loading?: boolean;
}

export const TableOverview: React.FC<TableOverviewProps> = ({
  table,
  loading,
}) => {
  if (loading) {
    return <div className="p-4 text-gray-500">Loading table details...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {table.name}
          </h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {table.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {table.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Owner
          </label>
          <div className="text-sm font-medium text-gray-900">
            {table.owner || "-"}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Created
          </label>
          <div className="text-sm font-medium text-gray-900">
            {table.created_at || "-"}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Updated
          </label>
          <div className="text-sm font-medium text-gray-900">
            {table.updated_at || "-"}
          </div>
        </div>
      </div>

      {table.storage_info && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Storage Information
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-md">
            <div>
              <span className="block text-xs text-gray-500">Format</span>
              <span className="text-sm font-medium">
                {table.storage_info.format}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Location</span>
              <span
                className="text-sm font-medium truncate"
                title={table.storage_info.location}
              >
                {table.storage_info.location}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Rows</span>
              <span className="text-sm font-medium">
                {table.storage_info.row_count?.toLocaleString() ?? "-"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Size</span>
              <span className="text-sm font-medium">
                {table.storage_info.size_bytes
                  ? (table.storage_info.size_bytes / 1024 / 1024).toFixed(2) +
                    " MB"
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { TableSchemaColumn } from "../../shared/types/table";

interface TableSchemaProps {
  columns: TableSchemaColumn[];
  loading?: boolean;
}

const SchemaRow: React.FC<{
  column: TableSchemaColumn;
  level?: number;
  parentPath?: string;
}> = ({ column, level = 0, parentPath = "" }) => {
  const currentPath = parentPath ? `${parentPath}.${column.name}` : column.name;
  const isNested = (column.fields?.length ?? 0) > 0;

  return (
    <>
      <tr className="hover:bg-[#f8f9fa] transition-colors group border-b border-[#f1f3f4]">
        <td
          className="px-6 py-4 whitespace-nowrap"
          style={{ paddingLeft: `${1.5 + level * 2}rem` }}
        >
          <div className="flex items-center gap-2">
            {level > 0 && <span className="text-[#dadce0]">⌞</span>}
            <span
              className={`text-sm font-medium ${isNested ? "text-[#1a73e8]" : "text-[#202124]"}`}
            >
              {column.name}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-xs font-mono text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded">
            {column.type}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`text-xs font-medium uppercase tracking-wider ${
              column.mode === "REQUIRED"
                ? "text-[#d93025]"
                : column.mode === "REPEATED"
                  ? "text-[#1a73e8]"
                  : "text-[#5f6368]"
            }`}
          >
            {column.mode}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-[#5f6368] max-w-md truncate">
          {column.description || "—"}
        </td>
      </tr>
      {column.fields?.map((field) => (
        <SchemaRow
          key={`${currentPath}.${field.name}`}
          column={field}
          level={level + 1}
          parentPath={currentPath}
        />
      ))}
    </>
  );
};

export const TableSchema: React.FC<TableSchemaProps> = ({ columns, loading }) => {
  if (loading) {
    return (
      <div className="p-12 text-center animate-pulse">
        <div className="space-y-4 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-white border border-[#dadce0] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="p-16 text-center bg-white border border-[#dadce0] rounded-lg shadow-sm">
        <div className="text-4xl mb-4">🧊</div>
        <h4 className="text-[#202124] font-medium mb-1 uppercase tracking-widest text-xs">
          No Schema Information
        </h4>
        <p className="text-[#5f6368] text-sm">
          Schema data has not been retrieved for this table yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#dadce0] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#dadce0]">
          <thead className="bg-[#f8f9fa]">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider"
              >
                Field Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider"
              >
                Mode
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider"
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#f1f3f4]">
            {columns.map((col) => (
              <SchemaRow key={col.name} column={col} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

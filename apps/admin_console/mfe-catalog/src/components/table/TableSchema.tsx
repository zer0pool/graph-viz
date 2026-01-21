import React from "react";
import { TableSchemaColumn } from "../../types/table";

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
      <tr className="hover:bg-blue-50/30 transition-colors group">
        <td
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
          style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}
        >
          <div className="flex items-center gap-2">
            {level > 0 && (
              <svg
                className="w-3 h-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            <span
              className={`font-mono text-xs ${
                isNested ? "font-bold text-blue-700" : "font-medium"
              }`}
            >
              {column.name}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-mono text-[10px] font-bold rounded uppercase tracking-tighter">
            {column.type}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              column.mode === "REQUIRED"
                ? "text-rose-600"
                : column.mode === "REPEATED"
                ? "text-indigo-600"
                : "text-gray-400"
            }`}
          >
            {column.mode}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-500 leading-relaxed italic">
          {column.description || (
            <span className="text-gray-300">No description</span>
          )}
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

export const TableSchema: React.FC<TableSchemaProps> = ({
  columns,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center animate-pulse">
        <div className="space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-gray-100 rounded-2xl mx-6">
        <div className="text-4xl mb-4">🧊</div>
        <h4 className="text-gray-900 font-bold mb-1 uppercase tracking-widest text-xs">
          No Schema Data
        </h4>
        <p className="text-gray-400 text-sm italic">
          Schema information has not been cataloged for this table yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-1">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
              >
                Field Name
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
              >
                Data Type
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
              >
                Mode
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {columns.map((col) => (
              <SchemaRow key={col.name} column={col} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from "react";
import { TableSchemaColumn } from "../../types/table";

interface TableSchemaProps {
  columns: TableSchemaColumn[];
  loading?: boolean;
}

const SchemaRow: React.FC<{ column: TableSchemaColumn; level?: number }> = ({
  column,
  level = 0,
}) => {
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 pl-[calc(1.5rem+${level*1.5}rem)]">
          <div className="flex items-center">
            {level > 0 && <span className="text-gray-300 mr-2">↳</span>}
            <span className="font-mono">{column.name}</span>
          </div>
        </td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 font-mono text-xs uppercase">
          {column.type}
        </td>
        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
          {column.mode}
        </td>
        <td className="px-6 py-3 text-sm text-gray-500">
          {column.description || "-"}
        </td>
      </tr>
      {column.fields?.map((field) => (
        <SchemaRow
          key={`${column.name}.${field.name}`}
          column={field}
          level={level + 1}
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
      <div className="p-4 text-center text-gray-500">Loading schema...</div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No schema information available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Column Name
            </th>
            <th
              scope="col"
              className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Type
            </th>
            <th
              scope="col"
              className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Mode
            </th>
            <th
              scope="col"
              className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Description
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {columns.map((col) => (
            <SchemaRow key={col.name} column={col} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

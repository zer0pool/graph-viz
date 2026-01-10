import React from "react";
import { TableLineageSummary, TableLineageRelation } from "../../types/table";

interface TableLineageProps {
  lineage: TableLineageSummary | null;
  loading: boolean;
}

export const TableLineage: React.FC<TableLineageProps> = ({
  lineage,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="flex flex-col items-center space-y-6">
          <div className="h-24 w-full bg-gray-100 rounded-xl"></div>
          <div className="h-8 w-8 text-gray-300">⬇️</div>
          <div className="h-24 w-full bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const upstreams = lineage?.upstreams || [];
  const downstreams = lineage?.downstreams || [];

  return (
    <div className="space-y-12 animate-fade-in py-4">
      {/* Upstream Section (Producers) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🏭</span>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
            Upstream Producers
          </h3>
          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
            {upstreams.length}
          </span>
        </div>

        {upstreams.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {upstreams.map((rel) => (
              <RelationRow key={rel.id} relation={rel} direction="in" />
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-xl text-center">
            <p className="text-sm text-gray-400 italic font-medium">
              No upstream producers detected for this table.
            </p>
          </div>
        )}
      </section>

      {/* Visual Bridge */}
      <div className="flex justify-center py-2">
        <div className="h-8 w-px bg-gradient-to-b from-blue-200 to-indigo-200"></div>
      </div>

      {/* Downstream Section (Consumers) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🏃‍♂️</span>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
            Downstream Consumers
          </h3>
          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
            {downstreams.length}
          </span>
        </div>

        {downstreams.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {downstreams.map((rel) => (
              <RelationRow key={rel.id} relation={rel} direction="out" />
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-xl text-center">
            <p className="text-sm text-gray-400 italic font-medium">
              This table has no downstream consumers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

const RelationRow: React.FC<{
  relation: TableLineageRelation;
  direction: "in" | "out";
}> = ({ relation, direction }) => {
  const isJob = relation.type === "job";
  return (
    <div className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            isJob ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600"
          }`}
        >
          {isJob ? "⚙️" : "📊"}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {relation.name}
            </span>
            {relation.status && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                  relation.status === "success" ||
                  relation.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {relation.status}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <span>{relation.type}</span>
            {relation.relation_type && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-blue-500">{relation.relation_type}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 hover:bg-blue-50 rounded-full text-blue-600 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

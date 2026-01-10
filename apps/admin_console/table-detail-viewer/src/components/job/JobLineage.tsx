import React from "react";
import { JobDetail, JobNodeRelation } from "../../types/job";

interface JobLineageProps {
  job: JobDetail;
  loading?: boolean;
}

export const JobLineage: React.FC<JobLineageProps> = ({ job, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const inputs = job.upstreams || [];
  const outputs = job.downstreams || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Input Tables
          </h3>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
            {inputs.length} detected
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Execution Behavior
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inputs.length > 0 ? (
                inputs.map((item, idx) => <RelationRow key={idx} item={item} />)
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-8 text-center text-sm text-gray-400 italic"
                  >
                    No input tables detected for this job.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Output Tables
          </h3>
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-bold rounded-full border border-purple-100">
            {outputs.length} detected
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {outputs.length > 0 ? (
            outputs.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-purple-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 mr-3">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2a4 4 0 014-4h4m-4-4l4 4-4 4"
                    />
                  </svg>
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {item.full_name || item.name}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">
                    {item.type}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 text-center text-sm text-gray-400 italic border-2 border-dashed border-gray-100 rounded-xl">
              No output tables detected.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const RelationRow: React.FC<{ item: JobNodeRelation }> = ({ item }) => {
  const isHard = item.dependency_type === "HARD";
  const icon = isHard ? "⏳" : "🔗";
  const behaviorText = isHard
    ? "Waits for data readiness"
    : "Runs on schedule (no wait)";
  const tooltip = isHard
    ? "This job waits for new data to be available in this table before starting."
    : "This job executes based on its schedule regardless of data readiness.";

  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-400 mr-3 group-hover:scale-125 transition-transform"></div>
          <span className="text-sm font-medium text-gray-900">
            {item.full_name || item.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center text-xs" title={tooltip}>
          <span className="text-base mr-2">{icon}</span>
          <div className="flex flex-col">
            <span
              className={`font-semibold ${
                isHard ? "text-amber-600" : "text-blue-600"
              }`}
            >
              {isHard ? "HARD" : "SOFT"}
            </span>
            <span className="text-gray-500 text-[10px]">{behaviorText}</span>
          </div>
        </div>
      </td>
    </tr>
  );
};

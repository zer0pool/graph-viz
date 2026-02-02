import React from "react";
import { JobDetail, JobNodeRelation } from "../../shared/types/job";
import { useMfeNavigate } from "../../shared/lib/navigation";

interface JobLineageProps {
  job: JobDetail;
  loading?: boolean;
}


export const JobLineage: React.FC<JobLineageProps> = ({ job, loading }) => {
  const navigate = useMfeNavigate();
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
    <div className="flex flex-col h-full bg-white space-y-8 animate-fade-in">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-[#202124] flex items-center gap-2">
            Input Tables
            <span className="text-xs font-normal text-[#5f6368] px-2 py-0.5 bg-[#f1f3f4] rounded-full">
              {inputs.length}
            </span>
          </h3>
        </div>
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
          <table className="min-w-full divide-y divide-[#f1f3f4]">
            <thead className="bg-[#f8f9fa]">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/2">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/4">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/4">
                  Execution Behavior
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4]">
              {inputs.length > 0 ? (
                inputs.map((item, idx) => <RelationRow key={idx} item={item} />)
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-sm text-[#5f6368] italic"
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
          <h3 className="text-base font-medium text-[#202124] flex items-center gap-2">
            Output Tables
            <span className="text-xs font-normal text-[#5f6368] px-2 py-0.5 bg-[#f1f3f4] rounded-full">
              {outputs.length}
            </span>
          </h3>
        </div>
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
          <table className="min-w-full divide-y divide-[#f1f3f4]">
            <thead className="bg-[#f8f9fa]">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/2">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/4">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase tracking-widest w-1/4">
                  Write Mode
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4]">
              {outputs.length > 0 ? (
                outputs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                          <span 
                            onClick={() => navigate(`/tables/${encodeURIComponent(item.full_name || item.name)}`)}
                            className="text-sm font-normal text-[#202124] group-hover:text-[#1a73e8] cursor-pointer hover:underline"
                          >
                            {item.full_name || item.name}
                          </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.storage === 'bigquery' ? 'bg-[#4285f4]' : 'bg-gray-400'}`} />
                        <span className="text-xs text-[#5f6368] font-normal uppercase">
                          {item.storage || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.write_mode === 'OVERWRITE' 
                          ? 'bg-red-50 text-red-700 border border-red-100' 
                          : 'bg-blue-50 text-[#1a73e8] border border-blue-100'
                      }`}>
                        {item.write_mode || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-sm text-[#5f6368] italic"
                  >
                    No output tables detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const RelationRow: React.FC<{ item: JobNodeRelation }> = ({ item }) => {
  const navigate = useMfeNavigate();
  const isHard = item.dependency_type === "HARD";
  const behaviorText = isHard
    ? "Waits for data readiness"
    : "Runs on schedule (no wait)";
  const tooltip = isHard
    ? "This job waits for new data to be available in this table before starting."
    : "This job executes based on its schedule regardless of data readiness.";

  return (
    <tr className="hover:bg-[#f8f9fa] transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center">
          <span 
            onClick={() => navigate(`/tables/${encodeURIComponent(item.full_name || item.name)}`)}
            className="text-sm font-normal text-[#202124] group-hover:text-[#1a73e8] cursor-pointer hover:underline"
          >
            {item.full_name || item.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className={`w-1.5 h-1.5 rounded-full ${item.storage === 'bigquery' ? 'bg-[#4285f4]' : 'bg-gray-400'}`} />
          <span className="text-xs text-[#5f6368] font-normal uppercase">
            {item.storage || "-"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center text-xs" title={tooltip}>
          <div className="flex flex-col">
            <span
              className={`font-semibold text-xs ${
                isHard ? "text-amber-600" : "text-[#1a73e8]"
              }`}
            >
              {isHard ? "HARD" : "SOFT"}
            </span>
            <span className="text-[#5f6368] text-[10px]">{behaviorText}</span>
          </div>
        </div>
      </td>
    </tr>
  );
};

import React from "react";
import { RefreshCw, Search } from "lucide-react";
import { JobSummary } from "../../entities/job/JobSummary";
import { JobTopLists } from "../../entities/job/JobTopLists";
import { Job } from "./useJobLanding";

import { JobMetric } from "./useJobLanding";

interface JobLandingViewProps {
  jobs: Job[];
  metrics: JobMetric[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigateToJob: (jobId: string) => void;
  getStatusColor: (status: string) => string;
}

export const JobLandingView: React.FC<JobLandingViewProps> = ({
  jobs,
  metrics,
  loading,
  error,
  onRefresh,
  onNavigateToJob,
  getStatusColor,
}) => {
  return (
    <div className="p-6">
      <header className="mb-8 flex justify-between items-end animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Monitoring</h1>
          <p className="text-slate-500">Monitor and manage all data pipelines</p>
        </div>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <div className="animate-fade-in-up delay-100">
        <JobSummary metrics={metrics} />
      </div>

      <div className="animate-fade-in-up delay-200">
        <JobTopLists />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8 animate-fade-in-up delay-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Recently Running Jobs (Total: {jobs.length})</h3>
            <div className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Filter jobs..." 
                        className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Job ID / Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex justify-center items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                            Loading jobs...
                        </div>
                    </td>
                </tr>
            ) : error ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-red-500 bg-red-50/20">
                        {error}
                    </td>
                </tr>
            ) : jobs.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No jobs found.
                    </td>
                </tr>
            ) : (
                jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                        <button
                            onClick={() => onNavigateToJob(job.job_id)}
                            className="text-start font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            {job.job_id}
                        </button>
                        <span className="text-xs text-slate-400">{job.job_name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                    <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${getStatusColor(job.running_status || "")}`}
                    >
                        {job.running_status}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                    <span className="text-slate-600 font-medium">{job.project_id || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      {job.owners && job.owners.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            {job.owners.slice(0, 1).map((owner, idx) => (
                              <div key={idx} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                {owner.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-slate-600 truncate max-w-[100px]">{job.owners[0]}</span>
                            {job.owners.length > 1 && (
                              <span 
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold cursor-help whitespace-nowrap"
                                title={job.owners.join(", ")}
                              >
                                +{job.owners.length - 1}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                              {job.owner?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="text-slate-600">{job.owner || "-"}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs tabular-nums">
                        {job.updated_at ? new Date(job.updated_at).toLocaleString() : "-"}
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

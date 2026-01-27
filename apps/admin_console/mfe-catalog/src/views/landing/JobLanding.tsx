import React, { useState, useEffect } from "react";
import { useMfeNavigate } from "../../utils/navigation";
import { JobSummary } from "../../components/JobSummary";
import { config } from "../../config";
import { RefreshCw, Play, Search, X } from "lucide-react";

interface Job {
  job_id: string;
  node_id: number;
  job_name: string;
  running_status: string;
  owner: string;
  project_id: string;
  enabled: boolean;
  updated_at: string | null;
}

export const JobLanding: React.FC = () => {
  const navigate = useMfeNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Explicitly requested limit=10
      const response = await fetch(`${config.API_BASE_URL}/api/v1/jobs?limit=10&offset=0`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      
      if (data && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      } else if (Array.isArray(data)) {
        setJobs(data);
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      console.error("Error fetching jobs:", err);
      setError("Failed to load job list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("SUCCESS") || s.includes("COMPLETED")) return "text-green-600 bg-green-50";
    if (s.includes("RUNNING") || s.includes("PENDING")) return "text-blue-600 bg-blue-50";
    if (s.includes("FAILED") || s.includes("ERROR")) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="p-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Monitoring</h1>
          <p className="text-slate-500">Monitor and manage all data pipelines</p>
        </div>
        <button 
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <JobSummary />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Active Pipelines (Total: {jobs.length})</h3>
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
                            onClick={() => navigate(`/jobs/${encodeURIComponent(job.job_id)}`)}
                            className="text-start font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            {job.job_id}
                        </button>
                        <span className="text-xs text-slate-400">{job.job_name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                    <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${getStatusColor(job.running_status)}`}
                    >
                        {job.running_status}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                    <span className="text-slate-600 font-medium">{job.project_id || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                            {job.owner?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-slate-600">{job.owner || "-"}</span>
                    </div>
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

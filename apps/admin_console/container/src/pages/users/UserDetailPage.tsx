import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  ArrowLeft,
  RefreshCw,
  Clock,
  Briefcase
} from "lucide-react";
import { config } from '../../shared/api/config';

interface ProjectData {
  project_id: string;
  display_name: string;
  status: string;
}

interface JobData {
  job_id: string;
  job_name: string;
  running_status: string;
  enabled: boolean;
}

interface UserData {
  user: {
    user_id: string;
    email: string;
    name: string;
    department: string;
    status: string;
    roles?: string[];
  };
  summary: {
    owned_jobs: number;
    project_count: number;
  };
}

export function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<UserData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userRes, projectsRes, jobsRes] = await Promise.all([
          fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(userId || "")}`),
          fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(userId || "")}/projects`),
          fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(userId || "")}/jobs`)
        ]);

        if (!userRes.ok) throw new Error("Failed to fetch user details");
        
        const userData = await userRes.json();
        setData(userData);

        if (projectsRes.ok) {
          const projectJson = await projectsRes.json();
          setProjects(projectJson.projects || []);
        }

        if (jobsRes.ok) {
          const jobJson = await jobsRes.json();
          setJobs(jobJson.jobs || []);
        }
      } catch (err: any) {
        console.error("Error fetching user detail:", err);
        setError(err.message || "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <p className="text-red-600 font-medium">{error || "User not found"}</p>
          <button
            onClick={() => navigate("/users")}
            className="mt-4 text-blue-600 hover:underline flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  const { user, summary } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Users
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 h-32 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 bg-blue-600 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white">
            <UserIcon className="w-12 h-12" />
          </div>
          <div className="absolute bottom-4 right-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {user.status}
            </span>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {user.user_id}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Email Address</p>
                <span className="font-medium">{user.email || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Building className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Department</p>
                <span className="font-medium">{user.department || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Access Role</p>
                <span className="font-medium">{user.roles?.join(", ") || "Viewer"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Project Membership</p>
                <span className="font-medium">{summary.project_count} Projects</span>
              </div>
            </div>
          </div>

          <section className="mt-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-500" />
              Project Memberships
            </h3>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div 
                    key={proj.project_id}
                    onClick={() => navigate(`/projects/${proj.project_id}`)}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {proj.display_name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${proj.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{proj.project_id}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <p className="text-sm text-slate-400 italic">No project memberships found.</p>
              </div>
            )}
          </section>

          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                Owned Assets (Jobs)
              </h3>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {summary.owned_jobs} Jobs
              </span>
            </div>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div 
                    key={job.job_id}
                    onClick={() => navigate(`/jobs/${job.job_id}`)}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${job.running_status === 'success' ? 'bg-green-500' : job.running_status === 'failed' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`} />
                      <div>
                        <p className="font-medium text-slate-700">{job.job_name}</p>
                        <p className="text-xs text-slate-400">{job.job_id}</p>
                      </div>
                    </div>
                    {!job.enabled && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">Disabled</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <p className="text-sm text-slate-400 italic">No owned jobs found.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

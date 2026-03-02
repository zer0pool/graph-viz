import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Building2,
  Shield,
  ArrowLeft,
  RefreshCw,
  Clock,
  Briefcase,
  FolderKanban,
  ChevronRight,
} from "lucide-react";
import { config } from "../../shared/api/config";

// --- Local UI Components (Matched with Project Style) ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`px-6 py-5 border-b border-gray-100 ${className}`}>{children}</div>;

const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <h3 className={`text-base font-semibold text-gray-900 ${className}`}>{children}</h3>;

const CardDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={`text-xs text-gray-500 mt-1 ${className}`}>{children}</p>;

const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 ${className}`}>{children}</div>;

const Badge = ({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}) => {
  const variants = {
    default: "bg-gray-100 text-gray-800 border-transparent",
    secondary: "bg-blue-100 text-blue-800 border-transparent",
    destructive: "bg-red-100 text-red-800 border-transparent",
    outline: "border-gray-200 text-gray-700",
    success: "bg-green-100 text-green-800 border-transparent",
    warning: "bg-amber-100 text-amber-800 border-transparent",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

const Separator = () => <div className="h-px bg-gray-100 w-full my-4" />;

const Avatar = ({ initials }: { initials: string }) => (
  <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
    {initials}
  </div>
);

// --- Types ---

interface ProjectData {
  project_id: string;
  display_name: string;
  status: string;
}

interface JobData {
  job_id: string;
  job_name: string;
  project_id: string; // Added project_id
  running_status: string;
  enabled: boolean;
  type: string;
  updated_at: string;
}

interface UserData {
  user: {
    user_id: string;
    email: string;
    name: string;
    department: string;
    status: string;
    roles?: string[];
    created_at?: string;
    last_login_at?: string;
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

  const fetchUserDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const decodedUserId = decodeURIComponent(userId || "");
      const [userRes, projectsRes, jobsRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(decodedUserId)}`),
        fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(decodedUserId)}/projects`),
        fetch(`${config.API_BASE_URL}/api/v1/users/${encodeURIComponent(decodedUserId)}/jobs`),
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
        const mappedJobs = (jobJson.jobs || []).map((j: any) => ({
          job_id: j.job_id,
          job_name: j.name,
          project_id: j.project_id, // Mapping project_id
          running_status: j.properties?.status || "unknown",
          enabled: j.properties?.enabled !== false,
          type: j.properties?.type || "N/A",
          updated_at: j.updated_at,
        }));
        setJobs(mappedJobs);
      }
    } catch (err: any) {
      console.error("Error fetching user detail:", err);
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      <div className="p-6 max-w-5xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-12">
          <p className="text-red-600 font-medium text-lg">{error || "User not found"}</p>
          <button
            onClick={() => navigate("/users")}
            className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to User Directory
          </button>
        </div>
      </div>
    );
  }

  const { user, summary } = data;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 gap-2 mb-2">
        <Link to="/users" className="hover:text-blue-600 transition-colors">
          Users
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium">{user.name}</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/users")}
            className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View user information, projects, and owned jobs
            </p>
          </div>
        </div>
        <button
          onClick={fetchUserDetail}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-8">
          <div className="flex items-start gap-8">
            <Avatar initials={initials} />
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">{user.name}</h2>
                <Badge
                  variant={user.status === "ACTIVE" ? "success" : "outline"}
                  className="text-[10px] py-0.5"
                >
                  {user.status}
                </Badge>
              </div>
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email || "no-email@company.com"}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    Department
                  </label>
                  <p className="text-sm text-gray-900">{user.department || "N/A"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    Access Roles
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role) => (
                      <Badge key={role} variant="secondary" className="text-[9px] px-2">
                        {role}
                      </Badge>
                    )) || (
                      <Badge variant="outline" className="text-[9px] px-2">
                        Viewer
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                    Project Membership
                  </label>
                  <p className="text-sm font-semibold text-blue-600">
                    {summary.project_count} Projects
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Last Active
                  </label>
                  <p className="text-sm text-gray-900">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Project Memberships - Table View */}
        <Card className="h-full">
          <CardHeader className="bg-gray-50/30 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-500" />
              Project Memberships
            </CardTitle>
            <CardDescription>Projects this user has access to</CardDescription>
          </CardHeader>
          <div className="overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium text-xs border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Project ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {projects.length > 0 ? (
                  projects.map((proj) => (
                    <tr
                      key={proj.project_id}
                      className="hover:bg-gray-50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/projects/${proj.project_id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-500 group-hover:text-blue-600 transition-colors">
                        {proj.project_id}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 text-sm">
                        {proj.display_name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={proj.status === "ACTIVE" ? "success" : "outline"}
                          className="text-[9px] px-2 py-0"
                        >
                          {proj.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      No project memberships found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Owned Assets (Jobs) - Simplified Table */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              <CardTitle>Owned Assets (Jobs)</CardTitle>
            </div>
            <div className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
              {summary.owned_jobs} Total
            </div>
          </CardHeader>
          <div className="overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium text-xs border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Job ID</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr
                      key={job.job_id}
                      className="hover:bg-gray-50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/jobs/${job.job_id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-500 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                        {job.job_id}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 text-sm">{user.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              ["RUNNING", "success", "ACTIVE"].includes(job.running_status)
                                ? "bg-green-500"
                                : ["failed", "ERROR"].includes(job.running_status)
                                  ? "bg-red-500"
                                  : ["PAUSED", "STALLED"].includes(job.running_status)
                                    ? "bg-amber-500"
                                    : ["DEPLOYED", "CREATED"].includes(job.running_status)
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                            }`}
                          />
                          <span className="text-[10px] font-medium uppercase text-gray-500">
                            {job.running_status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      No owned jobs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <style>{`
        .pulse-indicator {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  );
}

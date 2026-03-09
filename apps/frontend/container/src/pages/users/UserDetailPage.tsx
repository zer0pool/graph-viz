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

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../shared/ui/Card";
import { Badge } from "../../shared/ui/Badge";
import { Avatar } from "../../shared/ui/Avatar";
import { Separator } from "../../shared/ui/Separator";

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
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const fetchUserDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const decodedUserId = decodeURIComponent(userId || "");
      const [userRes, projectsRes, jobsRes] = await Promise.all([
        fetch(
          `${config.BASE_URL}/lineage-manager/api/v1/users/${encodeURIComponent(decodedUserId)}`
        ),
        fetch(
          `${config.BASE_URL}/lineage-manager/api/v1/users/${encodeURIComponent(decodedUserId)}/projects`
        ),
        fetch(
          `${config.BASE_URL}/lineage-manager/api/v1/users/${encodeURIComponent(decodedUserId)}/jobs`
        ),
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

  const handleEditRoles = () => {
    setSelectedRoles(user?.roles || []);
    setIsEditingRoles(true);
  };

  const handleToggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!userId) return;

    setSavingRoles(true);
    try {
      const decodedUserId = decodeURIComponent(userId);
      const response = await fetch(
        `${config.BASE_URL}/lineage-manager/api/v1/users/${encodeURIComponent(decodedUserId)}/roles`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roles: selectedRoles }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update roles");
      }

      // Update local state
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, roles: selectedRoles },
            }
          : null
      );

      setIsEditingRoles(false);
    } catch (err: any) {
      console.error("Error saving roles:", err);
      alert(err.message || "Failed to save roles");
    } finally {
      setSavingRoles(false);
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
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    Access Roles
                  </label>
                  <button
                    onClick={handleEditRoles}
                    className="text-[10px] text-blue-600 hover:underline font-medium"
                  >
                    (Edit)
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-[9px] px-2">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-2">
                      Viewer
                    </Badge>
                  )}
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

      {/* Edit Roles Modal */}
      {isEditingRoles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Access Roles</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Modify permissions for <strong>{user.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsEditingRoles(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className="h-5 w-5" />{" "}
                {/* Using RefreshCw as a placeholder for close if X not imported, but wait... X is not imported but lucide-react has it */}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {["PM", "OPERATOR", "DEVELOPER", "VIEWER"].map((role) => (
                <div
                  key={role}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleToggleRole(role)}
                >
                  <div
                    className={`w-5 h-5 rounded border ${selectedRoles.includes(role) ? "bg-blue-600 border-blue-600 flex items-center justify-center" : "border-gray-300"}`}
                  >
                    {selectedRoles.includes(role) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          role === "PM"
                            ? "secondary"
                            : role === "OPERATOR"
                              ? "default"
                              : role === "DEVELOPER"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {role}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsEditingRoles(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={savingRoles}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-md disabled:opacity-50"
              >
                {savingRoles ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

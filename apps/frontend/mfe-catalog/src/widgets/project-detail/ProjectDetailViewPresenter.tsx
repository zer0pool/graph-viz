import React from "react";
import { ViewMode } from "../../shared/types";
import { DetailLayout, Tab } from "../../shared/ui/DetailLayout";
import { CompactDetailLayout } from "../../shared/ui/CompactDetailLayout";
import { EntityHeader } from "../../shared/ui/EntityHeader";
import { HeaderActionButtons } from "../../shared/ui/HeaderActionButtons";
import { Boxes, Users, Briefcase, Box, User, ExternalLink, ShieldCheck } from "lucide-react";

const PROJECT_TABS: Tab[] = [{ id: "overview", label: "Overview" }];

interface ProjectDetailViewPresenterProps {
  projectId: string;
  mode: ViewMode;
  project: any;
  projectJobs: any[];
  projectUsers: any[];
  loading: boolean;
  error: any;
  onNavigateToJob: (id: string) => void;
  onNavigateToUser: (id: string) => void;
}

export const ProjectDetailViewPresenter: React.FC<ProjectDetailViewPresenterProps> = ({
  projectId,
  mode,
  project,
  projectJobs,
  projectUsers,
  loading,
  error,
  onNavigateToJob,
  onNavigateToUser,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg m-4 border border-red-100">
        <div className="text-red-500 font-bold mb-2">Project Error</div>
        <div className="text-sm text-red-600 font-mono">
          {error?.message || `Project not found: ${projectId}`}
        </div>
      </div>
    );
  }

  const Layout = mode === "EMBEDDED" ? CompactDetailLayout : (DetailLayout as any);

  const headerActions = <HeaderActionButtons onSync={() => console.log("Sync clicked")} />;

  const metadata = [
    { icon: Briefcase, label: project.business_unit || "General" },
    { icon: ShieldCheck, label: project.status || "ACTIVE" },
  ];

  const headerContent = (
    <EntityHeader
      icon={Boxes}
      iconClassName="bg-indigo-50 text-indigo-600 border-indigo-100"
      title={project.display_name || project.project_id || projectId}
      badge="Project"
      badgeVariant="outline"
      metadata={metadata}
      actions={headerActions}
      onFavoriteToggle={() => console.log("Project favorite clicked")}
    />
  );

  return (
    <Layout
      title={project.display_name || projectId}
      tabs={PROJECT_TABS}
      activeTab="overview"
      onTabChange={() => {}}
      mode={mode}
      type="table" // Using table layout style for simplicity
      headerContent={headerContent}
    >
      <div className="p-8 space-y-8 animate-fade-in">
        {project.description && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Description
            </h3>
            <p className="text-slate-700 leading-relaxed">{project.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Jobs List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800">Associated Jobs</h2>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                {projectJobs.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {projectJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                  No jobs assigned to this project.
                </div>
              ) : (
                projectJobs.map((job) => (
                  <div
                    key={job.job_id || job.id}
                    onClick={() => onNavigateToJob(job.job_id || job.id)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {job.job_name || job.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {job.job_id || job.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          job.running_status?.toUpperCase().includes("ACTIVE") ||
                          job.running_status?.toUpperCase().includes("RUNNING") ||
                          job.running_status?.toUpperCase().includes("SUCCESS")
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {job.running_status || job.status || "UNKNOWN"}
                      </Badge>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-slate-800">Project Members</h2>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {projectUsers.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {projectUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                  No members found in this project.
                </div>
              ) : (
                projectUsers.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => onNavigateToUser(user.user_id)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {user.name}
                        </span>
                        <span className="text-xs text-slate-500">{user.department || "N/A"}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const Badge = ({ children, variant = "default", className = "" }: any) => {
  const variants: any = {
    default: "bg-emerald-50 text-emerald-700 border-emerald-100",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    destructive: "bg-red-50 text-red-700 border-red-100",
    outline: "bg-white text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

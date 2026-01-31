import React from "react";

interface ProjectDetailViewPresenterProps {
  projectId: string;
  project: any;
  projectJobs: any[];
  onNavigateToJob: (id: string) => void;
  onNavigateToTable: (id: string) => void;
}

export const ProjectDetailViewPresenter: React.FC<ProjectDetailViewPresenterProps> = ({
  projectId,
  project,
  projectJobs,
  onNavigateToJob,
  onNavigateToTable,
}) => {
  if (!project) {
    return (
      <div className="p-8 text-center text-slate-500">
        Project not found: {projectId}
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="mb-8">
        <div className="text-sm text-indigo-600 font-semibold mb-1 uppercase tracking-wider">
          Project Context
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">{project.description}</p>
        <div className="mt-4 flex gap-4 text-sm text-slate-500">
          <span>
            Owner: <strong>{project.owner}</strong>
          </span>
          <span>•</span>
          <span>Created: {project.createdAt}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Associated Jobs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Associated Jobs
          </h2>
          <ul className="divide-y divide-slate-100">
            {projectJobs.map((job) => (
              <li
                key={job.id}
                className="py-3 flex justify-between items-center"
              >
                <button
                  onClick={() => onNavigateToJob(job.id)}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {job.name}
                </button>
                <span className="text-xs text-slate-400 capitalize">
                  {job.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Associated Tables */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Database Tables
          </h2>
          <ul className="divide-y divide-slate-100">
            {project.tableIds.map((table: string) => (
              <li
                key={table}
                className="py-3 flex justify-between items-center"
              >
                <button
                  onClick={() => onNavigateToTable(table)}
                  className="text-emerald-600 hover:underline font-medium text-sm"
                >
                  {table}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

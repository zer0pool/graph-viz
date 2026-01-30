import React from "react";
import { ViewMode } from "../../shared/types";
import { DetailLayout, Tab } from "../../shared/ui/DetailLayout";
import { JobOverview } from "../../entities/job/JobOverview";
import { JobLineage } from "../../entities/job/JobLineage";
import { JobRunHistory } from "../../entities/job/JobRunHistory";
import { JobRunTimeline } from "../../entities/job/JobRunTimeline";
import { JobRunDrawer } from "../../entities/job/JobRunDrawer";
import { EntityContextLink } from "../../shared/ui/EntityContextLink";
import { JobRun, Job } from "../../shared/types/job";

const JOB_TABS: Tab[] = [
  { id: "info", label: "Overview" },
  { id: "lineage", label: "Run Dependency" },
  { id: "runs", label: "Run History" },
];

interface JobDetailViewPresenterProps {
  jobId: string;
  mode: ViewMode;
  tab: string;
  onTabChange: (tab: string) => void;
  job: any;
  loadingJob: boolean;
  errorJob: any;
  runs: JobRun[];
  loadingRuns: boolean;
  projectJobs: any[];
  totalProjectJobs: number;
  loadingProjectJobs: boolean;
  page: number;
  pageSize: number;
  selectedRun: JobRun | null;
  onRunSelect: (runId: string) => void;
  onSetSelectedRun: (run: JobRun | null) => void;
  onCloseDrawer: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onNavigateToJob: (id: string) => void;
}

export const JobDetailViewPresenter: React.FC<JobDetailViewPresenterProps> = ({
  jobId,
  mode,
  tab,
  onTabChange,
  job,
  loadingJob,
  errorJob,
  runs,
  loadingRuns,
  projectJobs,
  totalProjectJobs,
  loadingProjectJobs,
  page,
  pageSize,
  selectedRun,
  onRunSelect,
  onSetSelectedRun,
  onCloseDrawer,
  onNextPage,
  onPrevPage,
  onNavigateToJob,
}) => {
  if (errorJob)
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg m-4 border border-red-100">
        <div className="text-red-500 font-bold mb-2">
          Error loading job details
        </div>
        <div className="text-sm text-red-600 font-mono">{errorJob.message}</div>
      </div>
    );

  return (
    <>
      <DetailLayout
        title={job?.job_id || jobId}
        tabs={JOB_TABS}
        activeTab={tab}
        onTabChange={onTabChange}
        mode={mode}
        type="job"
        owner={job?.owner || job?.properties?.owner}
        lifecycle={job?.lifecycle_status || job?.properties?.lifecycle_status}
      >
        <div className="p-6">
          {tab === "info" && (
            <div className="space-y-6 animate-fade-in">
              {/* Navigation Header */}
              <div className="flex items-center gap-8 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                <EntityContextLink
                  title="Parent Project"
                  label={job?.project_name || job?.project_id || "N/A"}
                  path={job?.project_id ? `/projects/${job.project_id}` : "/"}
                />
                <div className="w-px h-8 bg-slate-200" />
                <EntityContextLink
                  title="Registered By"
                  label={job?.owner || job?.properties?.owner || "N/A"}
                  path={job?.owner || job?.properties?.owner ? `/users/${job.owner || job.properties?.owner}` : "/"}
                />
              </div>

              <JobOverview
                job={job || { id: jobId, name: jobId, status: "loading" }}
                loading={loadingJob}
              />

              {/* Other Jobs in Project */}
              {job?.project_id && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Other Jobs in Project: <span className="text-blue-600">{job.project_name || job.project_id}</span>
                    </h3>
                  </div>
                  
                  {loadingProjectJobs ? (
                    <div className="text-sm text-gray-500">Loading other jobs...</div>
                  ) : (
                    <div className="space-y-2">
                       {projectJobs.filter(j => j.id !== jobId).length === 0 && (
                         <div className="text-sm text-gray-400 italic">No other jobs found in this project.</div>
                       )}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {projectJobs.filter(j => j.id !== jobId).map(otherJob => (
                          <div 
                            key={otherJob.id}
                            onClick={() => onNavigateToJob(otherJob.id)}
                            className="p-3 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all flex justify-between items-center group"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{otherJob.name || otherJob.id}</span>
                              <span className="text-[10px] text-gray-500">{otherJob.id}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              otherJob.status === 'RUNNING' || otherJob.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {otherJob.status}
                            </span>
                          </div>
                        ))}
                       </div>

                       {totalProjectJobs > pageSize && (
                         <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                           <button 
                            disabled={page === 0}
                            onClick={onPrevPage}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                           >
                             Previous
                           </button>
                           <span className="text-xs text-gray-500">
                             Page {page + 1} of {Math.ceil(totalProjectJobs / pageSize)}
                           </span>
                           <button 
                            disabled={(page + 1) * pageSize >= totalProjectJobs}
                            onClick={onNextPage}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                           >
                             Next
                           </button>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              )}

              <JobRunTimeline runs={runs} onRunSelect={onSetSelectedRun} />
            </div>
          )}
          {tab === "lineage" && (
            <div className="animate-fade-in">
              <JobLineage
                job={job || { id: jobId, name: jobId, status: "loading" }}
                loading={loadingJob}
              />
            </div>
          )}
          {tab === "runs" && (
            <div className="animate-fade-in">
              <JobRunHistory
                runs={runs}
                loading={loadingRuns}
                onRunSelect={onRunSelect}
              />
            </div>
          )}
        </div>
      </DetailLayout>

      {/* Slide-over Drawer for Run Details */}
      <JobRunDrawer run={selectedRun} onClose={onCloseDrawer} />
    </>
  );
};

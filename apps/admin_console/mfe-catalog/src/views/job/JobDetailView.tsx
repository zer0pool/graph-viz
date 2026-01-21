import React, { useState } from "react";
import { ViewMode } from "../../types";
import { DetailLayout, Tab } from "../../components/DetailLayout";
import { useJobOverview } from "../../hooks/useJobOverview";
import { useJobRunHistory } from "../../hooks/useJobRunHistory";
import { JobOverview } from "../../components/job/JobOverview";
import { JobLineage } from "../../components/job/JobLineage";
import { JobRunHistory } from "../../components/job/JobRunHistory";
import { JobRunTimeline } from "../../components/job/JobRunTimeline";
import { JobRunDrawer } from "../../components/job/JobRunDrawer";
import { JobRun } from "../../types/job";

const JOB_TABS: Tab[] = [
  { id: "info", label: "Overview" },
  { id: "lineage", label: "Run Dependency" },
  { id: "runs", label: "Run History" },
];

export const JobDetailView: React.FC<{
  jobId: string;
  mode?: ViewMode;
}> = ({ jobId, mode = "EMBEDDED" }) => {
  const [tab, setTab] = useState("info");
  const [selectedRun, setSelectedRun] = useState<JobRun | null>(null);

  // Hooks
  const { job, loading: loadingJob, error: errorJob } = useJobOverview(jobId);
  const {
    runs,
    loading: loadingRuns,
    error: errorRuns,
  } = useJobRunHistory(jobId);

  const handleRunSelect = (runId: string) => {
    const run = runs.find((r) => r.run_id === runId);
    if (run) setSelectedRun(run);
  };

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
        title={job?.name || jobId}
        tabs={JOB_TABS}
        activeTab={tab}
        onTabChange={setTab}
        mode={mode}
      >
        <div className="p-6">
          {tab === "info" && (
            <div className="space-y-6 animate-fade-in">
              <JobOverview
                job={job || { id: jobId, name: jobId, status: "loading" }}
                loading={loadingJob}
              />
              <JobRunTimeline runs={runs} onRunSelect={setSelectedRun} />
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
                onRunSelect={handleRunSelect}
              />
            </div>
          )}
        </div>
      </DetailLayout>

      {/* Slide-over Drawer for Run Details */}
      <JobRunDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
    </>
  );
};

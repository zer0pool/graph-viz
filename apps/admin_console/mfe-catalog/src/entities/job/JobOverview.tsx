import React from "react";
import { JobDetail } from "../../shared/types/job";

interface JobOverviewProps {
  job: JobDetail;
  loading?: boolean;
}

export const JobOverview: React.FC<JobOverviewProps> = ({ job, loading }) => {
  if (loading) {
    return <div className="p-4 text-gray-500">Loading job details...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="grid grid-cols-2 gap-x-16 gap-y-12">
        {/* Left Column: Job Details & Schedule */}
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-medium text-[#202124] mb-4">Job details</h2>
            <div className="divide-y divide-[#f1f3f4] border-t border-[#f1f3f4]">
              <PropertyRow label="Display Name" value={job.properties?.display_name || job.name} />
              <PropertyRow label="Job ID" value={job.job_id || job.id} />
              <PropertyRow label="Job Type" value={job.type || job.properties?.type} />
              <PropertyRow label="Status" value={job.status || job.properties?.status} />
            </div>
          </div>

          <div>
            <h3 className="text-base font-medium text-[#202124] mb-4">Schedule</h3>
            <div className="divide-y divide-[#f1f3f4] border-t border-[#f1f3f4]">
              <PropertyRow label="Cron Expression" value={job.properties?.schedule?.cron_expression || job.schedule} />
              <PropertyRow label="Start Date" value={job.properties?.schedule?.start_date} />
              <PropertyRow label="End Date" value={job.properties?.schedule?.end_date} />
              <PropertyRow 
                label="Enabled" 
                value={job.properties?.enabled === null ? "—" : (job.properties?.enabled ? "Yes" : "No")} 
              />
            </div>
          </div>
        </div>

        {/* Right Column: Ownership, Description & Labels */}
        <div className="space-y-8">
           <div>
            <h3 className="text-base font-medium text-[#202124] mb-4">Ownership & Context</h3>
            <div className="divide-y divide-[#f1f3f4] border-t border-[#f1f3f4]">
              <PropertyRow label="Owner" value={job.owner || job.properties?.owner} />
              <PropertyRow label="Project" value={job.project_name || job.project_id} isLink />
              <PropertyRow label="Lifecycle" value={job.lifecycle_status || job.properties?.lifecycle_status} />
            </div>
          </div>

          <div>
             <h2 className="text-sm font-bold text-[#5f6368] uppercase tracking-wider mb-2">Description</h2>
             <p className="text-sm text-[#3c4043] leading-relaxed">
               {job.description || job.properties?.description || "No description provided."}
             </p>
          </div>

          {/* Labels / Tags Section */}
          <div>
            <h3 className="text-base font-medium text-[#202124] mb-4">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {job.properties?.labels ? (
                Object.entries(job.properties.labels).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5 px-2 py-1 bg-[#f1f3f4] text-[#3c4043] rounded border border-[#dadce0] text-xs">
                    <span className="font-medium">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-[#5f6368] italic">No labels</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{ label: string; value?: string; isLink?: boolean }> = ({ label, value, isLink }) => (
  <div className="grid grid-cols-3 py-3 items-start">
    <span className="text-sm text-[#5f6368] col-span-1">{label}</span>
    <span className={`text-sm font-normal col-span-2 ${isLink ? 'text-[#1a73e8] hover:underline cursor-pointer' : 'text-[#202124]'}`}>
      {value || "—"}
    </span>
  </div>
);


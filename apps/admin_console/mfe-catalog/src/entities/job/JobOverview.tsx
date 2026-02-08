import React, { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Info, Shield, Zap, CheckCircle2, XCircle, Play, PanelLeft, Tag } from "lucide-react";
import { JobDetail } from "../../shared/types/job";
import { Badge } from "../../shared/ui/badge";
import { Card, CardContent } from "../../shared/ui/card";

interface JobOverviewProps {
  job: JobDetail;
  loading?: boolean;
}

export const JobOverview: React.FC<JobOverviewProps> = ({ job, loading }) => {
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-slate-500 animate-pulse">Loading job details...</div>;
  }

  const properties = job.properties || {};
  const status = job.status || properties.status || "UNKNOWN";

  const getStatusVariant = (s: string) => {
    const statusVal = s.toUpperCase();
    if (statusVal.includes("SUCCESS") || statusVal.includes("COMPLETED")) return "default"; // Greenish handled by custom class
    if (statusVal.includes("FAILED") || statusVal.includes("ERROR")) return "destructive";
    return "secondary";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Job Profile & Schedule */}
        <div className="space-y-6">
          {/* 4.2 Job Profile */}
          <Card className="border-slate-200/60 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-800">Job Profile</h3>
              </div>
              <div className="p-6 space-y-4">
                 <PropertyRow label="Job ID" value={job.job_id || job.id} />
                 <PropertyRow label="Project" value={properties.project || job.project_id} />
                 <PropertyRow label="Type" value={job.type || properties.type} />
                 <PropertyRow label="Logic" value={properties.logic_type || "Standard"} />
                  <PropertyRow 
                    label="Owners" 
                    value={
                      (properties.owners && properties.owners.length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {properties.owners.map((ownerId: string, idx: number) => (
                            <React.Fragment key={ownerId}>
                              <button 
                                onClick={() => window.dispatchEvent(new CustomEvent('mfe:navigate', { 
                                  detail: { path: `/users/${encodeURIComponent(ownerId)}` } 
                                }))}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              >
                                {ownerId}
                              </button>
                              {idx < properties.owners.length - 1 && <span className="text-slate-400">, </span>}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        properties.owner ? (
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('mfe:navigate', { 
                              detail: { path: `/users/${encodeURIComponent(properties.owner)}` } 
                            }))}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {properties.owner}
                          </button>
                        ) : "—"
                      )
                    } 
                  />
              </div>
            </CardContent>
          </Card>

          {/* 4.4 Schedule Summary */}
          <Card className="border-slate-200/60 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-slate-800">Schedule</h3>
              </div>
              <div className="p-6 space-y-4">
                 <PropertyRow label="Interval" value={properties.schedule?.interval || job.schedule} />
                 <PropertyRow label="Start" value={properties.schedule?.start_date} />
                 <PropertyRow label="End" value={properties.schedule?.end_date} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Execution Status & Metadata */}
        <div className="space-y-6">
          {/* 4.3 Execution Status */}
          <Card className="border-slate-200/60 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-800">Execution Status</h3>
              </div>
              <div className="p-6 space-y-4">
                 <PropertyRow 
                    label="Status" 
                    value={
                      <Badge variant={getStatusVariant(status)} className="font-bold">
                        {status}
                      </Badge>
                    } 
                 />
                 <PropertyRow 
                    label="Enabled" 
                    value={
                       <BooleanIndicator value={properties.enabled} />
                    } 
                 />
                 <PropertyRow 
                    label="DAG Active" 
                    value={
                       <BooleanIndicator value={properties.is_dag_active} />
                    } 
                 />
                 <PropertyRow 
                    label="Deleted" 
                    value={
                       <BooleanIndicator value={properties.is_deleted} reverse />
                    } 
                 />
              </div>
            </CardContent>
          </Card>

          {/* 4.5 Metadata (Advanced - Folded) */}
          <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <button
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-transparent focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-700">Metadata (Advanced)</h3>
              </div>
              {isMetadataExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {isMetadataExpanded && (
              <CardContent className="p-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
                <PropertyRow label="Created" value={properties.created_datetime} />
                <PropertyRow label="Updated" value={properties.updated_datetime || properties.update_datetime} />
              </CardContent>
            )}
          </Card>

          {/* Labels Section (Extra) */}
          <Card className="border-slate-200/60 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-wrap gap-2">
               {properties.labels ? (
                 Object.entries(properties.labels).map(([key, value]) => (
                   <div key={key} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 text-xs">
                     <Tag className="w-3 h-3 opacity-50" />
                     <span className="font-semibold">{key}:</span>
                     <span>{String(value)}</span>
                   </div>
                 ))
               ) : (
                 <span className="text-sm text-slate-400 italic px-2">No labels</span>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 items-center gap-4">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{label}</span>
    <span className="text-sm text-slate-900 col-span-2 flex items-center font-medium">
      {value || "—"}
    </span>
  </div>
);

const BooleanIndicator: React.FC<{ value?: boolean | null; reverse?: boolean }> = ({ value, reverse }) => {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  
  const isPositive = reverse ? !value : value;
  
  return (
    <div className="flex items-center gap-2">
      {isPositive ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300" />
      )}
      <span className={isPositive ? "text-slate-900" : "text-slate-400"}>
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
};


import React from "react";
import { TrendingUp, Clock, Cpu } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";

// Dummy data for Job Top Lists
const topSlotUsageJobs = [
  { name: "Daily_Sales_Aggregation", value: 450, unit: "slots", project: "sales_prod" },
  { name: "Risk_Model_Training_v2", value: 380, unit: "slots", project: "data_science" },
  { name: "User_Behavior_Streaming", value: 290, unit: "slots", project: "platform" },
  { name: "Inventory_Snapshot_Export", value: 210, unit: "slots", project: "erp_sync" },
  { name: "Marketing_Attribution_Job", value: 185, unit: "slots", project: "marketing" },
  { name: "Fraud_Detection_Realtime", value: 160, unit: "slots", project: "security" },
  { name: "Audit_Log_Compressor", value: 145, unit: "slots", project: "infra" },
  { name: "Customer_LTV_Calculation", value: 120, unit: "slots", project: "data_science" },
  { name: "Geo_Index_Rebuilder", value: 95, unit: "slots", project: "platform" },
  { name: "Legacy_Billing_Migration", value: 80, unit: "slots", project: "finance" },
];

const topLongRunningJobs = [
  { name: "Historical_Data_Reindexing", value: "8h 45m", seconds: 31500, project: "infra" },
  { name: "Monthly_Financial_Consolidation", value: "6h 12m", seconds: 22320, project: "finance" },
  { name: "Image_Feature_Extraction", value: "5h 30m", seconds: 19800, project: "content" },
  { name: "Vector_Database_Sync", value: "4h 15m", seconds: 15300, project: "search" },
  { name: "Global_Shipping_Forecast", value: "3h 50m", seconds: 13800, project: "logistics" },
  { name: "Multi_Touch_Attribution", value: "3h 20m", seconds: 12000, project: "marketing" },
  { name: "Network_Topology_Crawler", value: "2h 45m", seconds: 9900, project: "security" },
  { name: "Ecom_Inventory_Reconciliation", value: "2h 15m", seconds: 8100, project: "erp_sync" },
  { name: "Deep_Learning_Inference_Batch", value: "1h 55m", seconds: 6900, project: "data_science" },
  { name: "Internal_Slack_Bot_Analytics", value: "1h 30m", seconds: 5400, project: "platform" },
];

export function JobTopLists() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Top Slot Usage */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Cpu className="h-4 w-4" />
            </div>
            <div>
                <CardTitle className="text-lg text-slate-800">Top 10 Jobs by Slot Usage</CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-500">Jobs consuming highest peak slots</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-2">
            {topSlotUsageJobs.map((job, index) => (
              <div key={job.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <span className="text-slate-400 font-medium w-5">#{index + 1}</span>
                    <span className="font-semibold text-slate-700 truncate" title={job.name}>{job.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                        {job.project}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{job.value}</span>
                    <span className="text-slate-400">slots</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${(job.value / topSlotUsageJobs[0].value) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Duration */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                <Clock className="h-4 w-4" />
            </div>
            <div>
                <CardTitle className="text-lg">Top 10 Long Running Jobs</CardTitle>
                <CardDescription className="text-xs">Jobs with longest execution time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-2">
            {topLongRunningJobs.map((job, index) => (
              <div key={job.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <span className="text-slate-400 font-medium w-5">#{index + 1}</span>
                    <span className="font-semibold text-slate-700 truncate" title={job.name}>{job.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                        {job.project}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                    {job.value}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{
                      width: `${(job.seconds / topLongRunningJobs[0].seconds) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

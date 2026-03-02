import React, { useState } from "react";
import { TrendingUp, Clock, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";
import { cn } from "../../shared/lib/utils";

// Dummy data for Job Top Lists - Extended to 30 items
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
  { name: "Realtime_Fraud_Filter", value: 75, unit: "slots", project: "security" },
  { name: "Weekly_User_Churn_Model", value: 72, unit: "slots", project: "data_science" },
  { name: "Product_Catalog_Sync", value: 68, unit: "slots", project: "inventory" },
  { name: "Recommendation_Engine_v4", value: 65, unit: "slots", project: "platform" },
  { name: "Ad_Performance_Tracker", value: 62, unit: "slots", project: "marketing" },
  { name: "DWH_Incremental_Load", value: 58, unit: "slots", project: "infra" },
  { name: "User_Segment_Builder", value: 55, unit: "slots", project: "marketing" },
  { name: "Clickstream_ETL_L1", value: 52, unit: "slots", project: "platform" },
  { name: "Anomaly_Detection_Worker", value: 50, unit: "slots", project: "security" },
  { name: "Sales_Forecast_Daily", value: 48, unit: "slots", project: "sales_prod" },
  { name: "Log_Retention_Manager", value: 45, unit: "slots", project: "infra" },
  { name: "Search_Index_Warmup", value: 42, unit: "slots", project: "search" },
  { name: "Partner_API_Sync_Job", value: 40, unit: "slots", project: "integration" },
  { name: "Email_Campaign_Scheduler", value: 38, unit: "slots", project: "marketing" },
  { name: "DB_Snapshot_Backup", value: 35, unit: "slots", project: "infra" },
  { name: "Billing_Adjustment_Service", value: 32, unit: "slots", project: "finance" },
  { name: "Support_Ticket_Classifier", value: 30, unit: "slots", project: "ops" },
  { name: "GDPR_Data_Purger", value: 28, unit: "slots", project: "compliance" },
  { name: "CDN_Purge_Worker", value: 25, unit: "slots", project: "infra" },
  { name: "API_Usage_Aggregator", value: 22, unit: "slots", project: "platform" },
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
  {
    name: "Deep_Learning_Inference_Batch",
    value: "1h 55m",
    seconds: 6900,
    project: "data_science",
  },
  { name: "Internal_Slack_Bot_Analytics", value: "1h 30m", seconds: 5400, project: "platform" },
  { name: "External_Partner_Export", value: "1h 25m", seconds: 5100, project: "integration" },
  { name: "Legacy_Archive_Cleanup", value: "1h 20m", seconds: 4800, project: "infra" },
  { name: "Quarterly_Audit_Report", value: "1h 15m", seconds: 4500, project: "compliance" },
  { name: "Model_Retraining_Cycle", value: "1h 10m", seconds: 4200, project: "data_science" },
  { name: "Batch_Image_Resizer", value: "1h 05m", seconds: 3900, project: "content" },
  { name: "Clickstream_Sessionizer", value: "58m", seconds: 3480, project: "platform" },
  { name: "Daily_Backfill_Worker", value: "55m", seconds: 3300, project: "infra" },
  { name: "Marketing_Segment_Export", value: "52m", seconds: 3120, project: "marketing" },
  { name: "Security_Scan_L2", value: "50m", seconds: 3000, project: "security" },
  { name: "Log_Compression_Job", value: "48m", seconds: 2880, project: "infra" },
  { name: "Dataset_Materializer", value: "45m", seconds: 2700, project: "data_science" },
  { name: "Cold_Storage_Migrator", value: "42m", seconds: 2520, project: "infra" },
  { name: "Inventory_Snapshot_v2", value: "40m", seconds: 2400, project: "erp_sync" },
  { name: "Support_Data_Aggregator", value: "38m", seconds: 2280, project: "ops" },
  { name: "CDN_Cache_Warmer", value: "35m", seconds: 2100, project: "infra" },
  { name: "Payment_Gateway_Sync", value: "32m", seconds: 1920, project: "finance" },
  { name: "Weekly_Metrics_Digest", value: "30m", seconds: 1800, project: "platform" },
  { name: "API_Key_Rotation_Job", value: "28m", seconds: 1680, project: "security" },
  { name: "Feedback_Sentiment_Bot", value: "25m", seconds: 1500, project: "ops" },
  { name: "Geo_Tiles_Generator", value: "22m", seconds: 1320, project: "platform" },
];

const LIMIT_OPTIONS = [5, 10, 30];

export function JobTopLists() {
  const [limit, setLimit] = useState<number>(5);

  const LimitSelector = () => (
    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
      {LIMIT_OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => setLimit(opt)}
          className={cn(
            "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
            limit === opt
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Slot Usage */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-800">
                    Top {limit} Jobs by Slot Usage
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500">
                    Jobs consuming highest peak slots
                  </CardDescription>
                </div>
              </div>
              <LimitSelector />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {topSlotUsageJobs.slice(0, limit).map((job, index) => (
                <div key={job.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <span className="text-slate-400 font-medium w-5">#{index + 1}</span>
                      <span className="font-semibold text-slate-700 truncate" title={job.name}>
                        {job.name}
                      </span>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Top {limit} Long Running Jobs</CardTitle>
                  <CardDescription className="text-xs">
                    Jobs with longest execution time
                  </CardDescription>
                </div>
              </div>
              <LimitSelector />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {topLongRunningJobs.slice(0, limit).map((job, index) => (
                <div key={job.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <span className="text-slate-400 font-medium w-5">#{index + 1}</span>
                      <span className="font-semibold text-slate-700 truncate" title={job.name}>
                        {job.name}
                      </span>
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
    </div>
  );
}

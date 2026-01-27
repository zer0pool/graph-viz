import React from "react";
import {
  Plus,
  Download,
  Filter,
  RefreshCw,
  Table2,
  Database,
  Clock,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { TrendsSection } from "./TrendsSection";
import { TopLists } from "./TopLists";
import { DatasetsTable } from "./DatasetsTable";
import { SummaryGrid } from "../../components/common/SummaryGrid";

import { datasetsData } from "./data";

const totalTables = datasetsData.reduce((sum, d) => sum + d.tables, 0);
const totalSize = datasetsData.reduce((sum, d) => sum + d.sizeBytes, 0) / 1000; // in TB
const totalDelayed = datasetsData.reduce((sum, d) => sum + d.delayed, 0);
const totalExpiring = datasetsData.reduce((sum, d) => sum + d.expiring, 0);
const slaBreach = datasetsData.filter((d) => d.delayed > 10).length;

// Lineage coverage
const tablesWithLineage = 1124;
const lineageCoverage = ((tablesWithLineage / totalTables) * 100).toFixed(1);

export function TableLanding() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tables & Datasets
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor dataset health, capacity, and compliance status
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <SummaryGrid 
        cols={7}
        metrics={[
          { type: "total_tables", value: totalTables, subtext: "+23 today" },
          { type: "total_datasets", value: datasetsData.length, subtext: "6 schemas" },
          { type: "total_size", value: `${totalSize.toFixed(1)} TB`, subtext: "+2.4 TB/day" },
          { type: "delayed", value: totalDelayed, subtext: "last 24h" },
          { type: "expiring_soon", value: totalExpiring, subtext: "<7 days left" },
          { type: "sla_breach", value: slaBreach, subtext: "Critical", status: "critical" },
          { type: "lineage_coverage", value: `${lineageCoverage}%`, subtext: `${tablesWithLineage} / ${totalTables}` }
        ]}
      />

      {/* Trends Section */}
      <TrendsSection />

      {/* Top 10 Lists */}
      <TopLists />

      {/* All Datasets Table */}
      <DatasetsTable />
    </div>
  );
}

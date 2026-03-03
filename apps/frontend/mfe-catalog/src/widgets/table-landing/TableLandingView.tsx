import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../shared/ui/button";
import { TrendsSection } from "../../features/trends/TrendsSection";
import { TopLists } from "../../entities/table/TopLists";
import { DatasetsTable } from "../../features/datasets-table/DatasetsTable";
import { SummaryGrid } from "../../shared/ui/SummaryGrid";
import { TableMetric } from "./useTableLanding";

interface TableLandingViewProps {
  metrics: TableMetric[];
  onRefresh: () => void;
}

export function TableLandingView({ metrics, onRefresh }: TableLandingViewProps) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables & Datasets</h1>
          <p className="text-muted-foreground mt-1">
            Monitor dataset health, capacity, and compliance status
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="animate-fade-in-up delay-100">
        <SummaryGrid cols={5} metrics={metrics} />
      </div>

      {/* Trends Section */}
      <div className="animate-fade-in-up delay-200">
        <TrendsSection />
      </div>

      {/* Top 10 Lists */}
      <div className="animate-fade-in-up delay-300">
        <TopLists />
      </div>

      {/* All Datasets Table */}
      <div className="animate-fade-in-up delay-300">
        <DatasetsTable />
      </div>
    </div>
  );
}

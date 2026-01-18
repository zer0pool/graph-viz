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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Tables
            </CardDescription>
            <CardTitle className="text-3xl">
              {totalTables.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">+23 today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Datasets
            </CardDescription>
            <CardTitle className="text-3xl">{datasetsData.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">6 schemas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Size</CardDescription>
            <CardTitle className="text-3xl">
              {totalSize.toFixed(1)} TB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">+2.4 TB/day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Delayed
            </CardDescription>
            <CardTitle className="text-3xl">{totalDelayed}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">last 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Expiring Soon
            </CardDescription>
            <CardTitle className="text-3xl">{totalExpiring}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">&lt;7 days left</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              SLA Breach
            </CardDescription>
            <CardTitle className="text-3xl">{slaBreach}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Lineage Coverage
            </CardDescription>
            <CardTitle className="text-3xl">{lineageCoverage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {tablesWithLineage} / {totalTables}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Section */}
      <TrendsSection />

      {/* Top 10 Lists */}
      <TopLists />

      {/* All Datasets Table */}
      <DatasetsTable />
    </div>
  );
}

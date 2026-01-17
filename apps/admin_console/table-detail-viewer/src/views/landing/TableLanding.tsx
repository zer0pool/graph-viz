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

// Mock Data
export const datasetsData = [
  {
    name: "analytics_prod",
    tables: 247,
    size: "28.4 TB",
    sizeBytes: 28400,
    delayed: 5,
    expiring: 2,
    schemaChanges: 3,
    lastModified: "2026-01-17 14:30",
    service: "account",
    growth: "+12%",
  },
  {
    name: "user_events",
    tables: 189,
    size: "18.9 TB",
    sizeBytes: 18900,
    delayed: 12,
    expiring: 0,
    schemaChanges: 1,
    lastModified: "2026-01-17 14:25",
    service: "scheduling",
    growth: "+8%",
  },
  {
    name: "finance_data",
    tables: 156,
    size: "15.2 TB",
    sizeBytes: 15200,
    delayed: 3,
    expiring: 4,
    schemaChanges: 0,
    lastModified: "2026-01-17 14:10",
    service: "dip",
    growth: "+3%",
  },
  {
    name: "marketing_campaigns",
    tables: 98,
    size: "12.7 TB",
    sizeBytes: 12700,
    delayed: 8,
    expiring: 1,
    schemaChanges: 2,
    lastModified: "2026-01-17 13:45",
    service: "eStore",
    growth: "+15%",
  },
  {
    name: "product_catalog",
    tables: 67,
    size: "8.3 TB",
    sizeBytes: 8300,
    delayed: 2,
    expiring: 0,
    schemaChanges: 1,
    lastModified: "2026-01-17 12:20",
    service: "dqa",
    growth: "+5%",
  },
  {
    name: "warehouse_inventory",
    tables: 134,
    size: "22.1 TB",
    sizeBytes: 22100,
    delayed: 15,
    expiring: 3,
    schemaChanges: 4,
    lastModified: "2026-01-17 11:30",
    service: "vdkpi",
    growth: "+7%",
  },
  {
    name: "customer_profiles",
    tables: 78,
    size: "9.8 TB",
    sizeBytes: 9800,
    delayed: 6,
    expiring: 5,
    schemaChanges: 0,
    lastModified: "2026-01-17 10:15",
    service: "account",
    growth: "+4%",
  },
  {
    name: "legacy_archive",
    tables: 423,
    size: "32.6 TB",
    sizeBytes: 32600,
    delayed: 28,
    expiring: 8,
    schemaChanges: 5,
    lastModified: "2026-01-15 18:00",
    service: "scheduling",
    growth: "+1%",
  },
];

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
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Dataset
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
    </div>
  );
}

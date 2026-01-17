import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Download, Filter, Search, Database, Table2, RefreshCw, AlertTriangle, Clock, TrendingUp, GitBranch, Activity } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Breadcrumb } from '../Breadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const services = ['account', 'scheduling', 'dip', 'eStore', 'dqa', 'vdkpi'];

const datasetsData = [
  { 
    name: 'analytics_prod', 
    tables: 247, 
    size: '28.4 TB',
    sizeBytes: 28400,
    delayed: 5, 
    expiring: 2,
    schemaChanges: 3,
    lastModified: '2026-01-17 14:30',
    service: 'account',
    growth: '+12%'
  },
  { 
    name: 'user_events', 
    tables: 189, 
    size: '18.9 TB',
    sizeBytes: 18900,
    delayed: 12, 
    expiring: 0,
    schemaChanges: 1,
    lastModified: '2026-01-17 14:25',
    service: 'scheduling',
    growth: '+8%'
  },
  { 
    name: 'finance_data', 
    tables: 156, 
    size: '15.2 TB',
    sizeBytes: 15200,
    delayed: 3, 
    expiring: 4,
    schemaChanges: 0,
    lastModified: '2026-01-17 14:10',
    service: 'dip',
    growth: '+3%'
  },
  { 
    name: 'marketing_campaigns', 
    tables: 98, 
    size: '12.7 TB',
    sizeBytes: 12700,
    delayed: 8, 
    expiring: 1,
    schemaChanges: 2,
    lastModified: '2026-01-17 13:45',
    service: 'eStore',
    growth: '+15%'
  },
  { 
    name: 'product_catalog', 
    tables: 67, 
    size: '8.3 TB',
    sizeBytes: 8300,
    delayed: 2, 
    expiring: 0,
    schemaChanges: 1,
    lastModified: '2026-01-17 12:20',
    service: 'dqa',
    growth: '+5%'
  },
  { 
    name: 'warehouse_inventory', 
    tables: 134, 
    size: '22.1 TB',
    sizeBytes: 22100,
    delayed: 15, 
    expiring: 3,
    schemaChanges: 4,
    lastModified: '2026-01-17 11:30',
    service: 'vdkpi',
    growth: '+7%'
  },
  { 
    name: 'customer_profiles', 
    tables: 78, 
    size: '9.8 TB',
    sizeBytes: 9800,
    delayed: 6, 
    expiring: 5,
    schemaChanges: 0,
    lastModified: '2026-01-17 10:15',
    service: 'account',
    growth: '+4%'
  },
  { 
    name: 'legacy_archive', 
    tables: 423, 
    size: '32.6 TB',
    sizeBytes: 32600,
    delayed: 28, 
    expiring: 8,
    schemaChanges: 5,
    lastModified: '2026-01-15 18:00',
    service: 'scheduling',
    growth: '+1%'
  },
];

// Calculate activity score: 5 × Delayed + 2 × Expiring + 1 × Schema Changes
const calculateActivityScore = (dataset: typeof datasetsData[0]) => {
  return (dataset.delayed * 5) + (dataset.expiring * 2) + (dataset.schemaChanges * 1);
};

const topCapacityDatasets = [...datasetsData]
  .sort((a, b) => b.sizeBytes - a.sizeBytes)
  .slice(0, 10);

const topActivityDatasets = [...datasetsData]
  .map(d => ({ ...d, activityScore: calculateActivityScore(d) }))
  .sort((a, b) => b.activityScore - a.activityScore)
  .slice(0, 10);

const totalTables = datasetsData.reduce((sum, d) => sum + d.tables, 0);
const totalSize = datasetsData.reduce((sum, d) => sum + d.sizeBytes, 0) / 1000; // in TB
const totalDelayed = datasetsData.reduce((sum, d) => sum + d.delayed, 0);
const totalExpiring = datasetsData.reduce((sum, d) => sum + d.expiring, 0);
const slaBreach = datasetsData.filter(d => d.delayed > 10).length;

// Lineage coverage
const tablesWithLineage = 1124;
const lineageCoverage = ((tablesWithLineage / totalTables) * 100).toFixed(1);

// Trends data (30 days)
const tablesTrend = [
  { day: 'Day 1', tables: 1420 },
  { day: 'Day 5', tables: 1435 },
  { day: 'Day 10', tables: 1458 },
  { day: 'Day 15', tables: 1482 },
  { day: 'Day 20', tables: 1510 },
  { day: 'Day 25', tables: 1548 },
  { day: 'Day 30', tables: totalTables },
];

const storageTrend = [
  { day: 'Day 1', size: 135.2 },
  { day: 'Day 5', size: 136.8 },
  { day: 'Day 10', size: 138.1 },
  { day: 'Day 15', size: 139.5 },
  { day: 'Day 20', size: 140.8 },
  { day: 'Day 25', size: 141.6 },
  { day: 'Day 30', size: totalSize },
];

const issuesTrend = [
  { day: 'Day 1', delayed: 45, expiring: 18, sla: 3 },
  { day: 'Day 5', delayed: 52, expiring: 15, sla: 4 },
  { day: 'Day 10', delayed: 58, expiring: 20, sla: 2 },
  { day: 'Day 15', delayed: 62, expiring: 22, sla: 3 },
  { day: 'Day 20', delayed: 68, expiring: 19, sla: 1 },
  { day: 'Day 25', delayed: 72, expiring: 21, sla: 2 },
  { day: 'Day 30', delayed: totalDelayed, expiring: totalExpiring, sla: slaBreach },
];

export function TablesPage() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Breadcrumb items={[{ label: 'Tables' }]} />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Tables & Datasets</h1>
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
            <CardTitle className="text-3xl">{totalTables.toLocaleString()}</CardTitle>
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
            <CardTitle className="text-3xl">{totalSize.toFixed(1)} TB</CardTitle>
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
            <p className="text-sm text-muted-foreground">{tablesWithLineage} / {totalTables}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Trends (Last 30 Days)</CardTitle>
          <CardDescription>Historical data for tables, storage, and issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tables Count Trend */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tables Count</h4>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={tablesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tables" stroke="#1a73e8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Started: 1,420</span>
                <span className="font-medium">Current: {totalTables.toLocaleString()}</span>
              </div>
            </div>

            {/* Storage Size Trend */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Storage Size (TB)</h4>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={storageTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="size" stroke="#34a853" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Started: 135.2 TB</span>
                <span className="font-medium">Current: {totalSize.toFixed(1)} TB</span>
              </div>
            </div>

            {/* Issues Trend */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Issues (Delayed / Expiring / SLA)</h4>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={issuesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="delayed" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expiring" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sla" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-3">
                  <span className="text-orange-500">Delayed: {totalDelayed}</span>
                  <span className="text-yellow-500">Expiring: {totalExpiring}</span>
                  <span className="text-red-500">SLA: {slaBreach}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>용량 Top 10 Dataset</CardTitle>
            <CardDescription>Largest datasets by storage size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCapacityDatasets.map((dataset, index) => (
                <div key={dataset.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-6">#{index + 1}</span>
                      <span className="font-medium">{dataset.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {dataset.growth}
                      </Badge>
                      <span className="font-mono font-medium">{dataset.size}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${(dataset.sizeBytes / topCapacityDatasets[0].sizeBytes) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Activity */}
        <Card>
          <CardHeader>
            <CardTitle>가장 활동이 활발한 상위 10개 Dataset</CardTitle>
            <CardDescription>Most active datasets based on recent changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topActivityDatasets.map((dataset, index) => (
                <div key={dataset.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-muted-foreground w-6 text-sm">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{dataset.name}</p>
                      <div className="flex gap-2 mt-1">
                        {dataset.delayed > 0 && (
                          <span className="text-xs text-orange-600">Delayed: {dataset.delayed} (×5)</span>
                        )}
                        {dataset.expiring > 0 && (
                          <span className="text-xs text-yellow-600">Expiring: {dataset.expiring} (×2)</span>
                        )}
                        {dataset.schemaChanges > 0 && (
                          <span className="text-xs text-blue-600">Schema: {dataset.schemaChanges} (×1)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono font-medium text-sm">{dataset.activityScore}</p>
                      <p className="text-xs text-muted-foreground">activity</p>
                    </div>
                    <Badge 
                      variant={
                        dataset.activityScore > 50 ? 'destructive' : 
                        dataset.activityScore > 20 ? 'default' : 
                        'secondary'
                      }
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {dataset.activityScore > 50 ? 'High' : dataset.activityScore > 20 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Datasets</CardTitle>
              <CardDescription>Complete list of datasets with health metrics</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search datasets..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">#Tables</TableHead>
                <TableHead className="text-right">Total Size</TableHead>
                <TableHead className="text-center">Delayed</TableHead>
                <TableHead className="text-center">Expiring</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasetsData.map((dataset) => (
                <TableRow key={dataset.name}>
                  <TableCell className="font-mono font-medium">{dataset.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {dataset.tables}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-medium">{dataset.size}</p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24 ml-auto">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${(dataset.sizeBytes / 32600) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {dataset.delayed > 0 ? (
                      <Badge variant={dataset.delayed > 10 ? 'destructive' : 'secondary'}>
                        {dataset.delayed}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {dataset.expiring > 0 ? (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {dataset.expiring}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dataset.lastModified}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dataset.service}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View Tables
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Breadcrumb } from '../Breadcrumb';

const recentJobs = [
  { id: 'JOB-001', name: 'ETL Pipeline Alpha', status: 'running', date: '2026-01-17 14:23', duration: '5m 23s' },
  { id: 'JOB-002', name: 'Data Sync Beta', status: 'completed', date: '2026-01-17 14:10', duration: '2m 15s' },
  { id: 'JOB-003', name: 'Analytics Export', status: 'running', date: '2026-01-17 14:05', duration: '12m 45s' },
  { id: 'JOB-004', name: 'Backup Process', status: 'pending', date: '2026-01-17 14:00', duration: '-' },
  { id: 'JOB-005', name: 'Cleanup Task', status: 'completed', date: '2026-01-17 13:45', duration: '1m 32s' },
];

export function DashboardPage() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your data operations
          </p>
        </div>
        <div className="flex gap-3">
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
            New Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="text-3xl">142</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+8 from last hour</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tables</CardDescription>
            <CardTitle className="text-3xl">3,247</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+23 from yesterday</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Data Processed</CardDescription>
            <CardTitle className="text-3xl">2.4 TB</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl">47</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Online now</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overall system performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CPU Usage</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="font-medium">68%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">82%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events in your console</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">Job ETL Pipeline Alpha completed successfully</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">New table 'customers_v2' created</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">User 'john.doe@company.com' logged in</p>
                  <p className="text-xs text-muted-foreground">32 minutes ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">Data lineage updated for analytics dataset</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Overview of recently executed data processing jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'running'
                          ? 'default'
                          : item.status === 'pending'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
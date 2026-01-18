import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Download, Filter, Play, Pause, StopCircle, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Breadcrumb } from '../Breadcrumb';

const jobsData = {
  running: [
    { id: 'JOB-1423', name: 'ETL Pipeline Alpha', type: 'ETL', started: '2026-01-17 14:23', duration: '5m 23s', progress: 65 },
    { id: 'JOB-1425', name: 'Analytics Export', type: 'Export', started: '2026-01-17 14:05', duration: '12m 45s', progress: 42 },
    { id: 'JOB-1427', name: 'Data Validation', type: 'Validation', started: '2026-01-17 14:30', duration: '2m 15s', progress: 88 },
  ],
  pending: [
    { id: 'JOB-1428', name: 'Backup Process', type: 'Backup', scheduled: '2026-01-17 15:00', priority: 'high' },
    { id: 'JOB-1429', name: 'Cleanup Task', type: 'Maintenance', scheduled: '2026-01-17 15:15', priority: 'medium' },
    { id: 'JOB-1430', name: 'Data Migration', type: 'Migration', scheduled: '2026-01-17 15:30', priority: 'low' },
  ],
  completed: [
    { id: 'JOB-1420', name: 'Data Sync Beta', type: 'Sync', completed: '2026-01-17 14:10', duration: '2m 15s', status: 'success' },
    { id: 'JOB-1419', name: 'Report Generation', type: 'Report', completed: '2026-01-17 14:00', duration: '8m 42s', status: 'success' },
    { id: 'JOB-1418', name: 'Data Import', type: 'Import', completed: '2026-01-17 13:45', duration: '1m 32s', status: 'success' },
    { id: 'JOB-1417', name: 'Schema Update', type: 'DDL', completed: '2026-01-17 13:30', duration: '45s', status: 'failed' },
  ],
};

export function JobsPage() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Breadcrumb items={[{ label: 'Jobs' }]} />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your data processing jobs
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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Running
            </CardDescription>
            <CardTitle className="text-3xl">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Currently executing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Waiting to start</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed Today
            </CardDescription>
            <CardTitle className="text-3xl">28</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed Today
            </CardDescription>
            <CardTitle className="text-3xl">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Tabs */}
      <Tabs defaultValue="running" className="space-y-4">
        <TabsList>
          <TabsTrigger value="running">Running ({jobsData.running.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({jobsData.pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({jobsData.completed.length})</TabsTrigger>
        </TabsList>

        {/* Running Jobs */}
        <TabsContent value="running" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Running Jobs</CardTitle>
              <CardDescription>Jobs currently being executed</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData.running.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.started}</TableCell>
                      <TableCell className="font-mono text-sm">{job.duration}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${job.progress}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground">{job.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Jobs */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Jobs</CardTitle>
              <CardDescription>Jobs scheduled to run</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData.pending.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.scheduled}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.priority === 'high'
                              ? 'destructive'
                              : job.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {job.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Jobs */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Jobs</CardTitle>
              <CardDescription>Recently finished jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData.completed.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.completed}</TableCell>
                      <TableCell className="font-mono text-sm">{job.duration}</TableCell>
                      <TableCell>
                        <Badge variant={job.status === 'success' ? 'default' : 'destructive'}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
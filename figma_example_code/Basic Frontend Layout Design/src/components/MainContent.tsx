import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Download, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';

const mockData = [
  { id: '001', name: 'Project Alpha', status: 'active', date: '2026-01-10', value: '$12,450' },
  { id: '002', name: 'Project Beta', status: 'pending', date: '2026-01-12', value: '$8,230' },
  { id: '003', name: 'Project Gamma', status: 'active', date: '2026-01-09', value: '$15,890' },
  { id: '004', name: 'Project Delta', status: 'completed', date: '2026-01-05', value: '$22,100' },
  { id: '005', name: 'Project Epsilon', status: 'active', date: '2026-01-14', value: '$9,760' },
];

export function MainContent() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
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
          <CardHeader>
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle>142</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">+8 from last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Tables</CardDescription>
            <CardTitle>3,247</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">+23 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Data Processed</CardDescription>
            <CardTitle>2.4 TB</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Users</CardDescription>
            <CardTitle>47</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Online now</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
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
              {mockData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'active'
                          ? 'default'
                          : item.status === 'pending'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell className="text-right">{item.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
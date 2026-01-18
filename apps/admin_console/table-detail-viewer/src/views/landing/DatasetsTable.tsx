import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { datasetsData } from "./data";

export function DatasetsTable() {
  // Calculate max size for relative bars
  const maxSize = Math.max(...datasetsData.map((d) => d.sizeBytes));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>All Datasets</CardTitle>
          <CardDescription>
            Complete list of datasets with health metrics
          </CardDescription>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search datasets..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Dataset</TableHead>
              <TableHead className="text-center">#Tables</TableHead>
              <TableHead className="w-[200px]">Total Size</TableHead>
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
                <TableCell className="font-medium">{dataset.name}</TableCell>
                <TableCell className="text-center">{dataset.tables}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{dataset.size}</span>
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(dataset.sizeBytes / maxSize) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {dataset.delayed > 0 ? (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                    >
                      {dataset.delayed}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {dataset.expiring > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/30 text-muted-foreground"
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        {dataset.expiring}
                      </div>
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {dataset.lastModified}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground"
                  >
                    {dataset.service}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/tables/${dataset.name}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

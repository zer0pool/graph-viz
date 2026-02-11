import React from "react";
import { Search, Database } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { Badge } from "../../shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";
import { Input } from "../../shared/ui/input";
import { Button } from "../../shared/ui/button";

interface DatasetsTableViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  datasets: any[];
  maxSize: number;
  onViewDetail: (name: string) => void;
}

export function DatasetsTableView({
  search,
  onSearchChange,
  datasets,
  maxSize,
  onViewDetail,
}: DatasetsTableViewProps) {
  return (
    <Card className="border-slate-200/60 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-slate-50/50 border-b border-slate-100">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            All Datasets
          </CardTitle>
          <CardDescription className="text-slate-500">
            Complete list of datasets with health metrics
          </CardDescription>
        </div>
        <div className="relative w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search datasets..." 
            className="pl-10 bg-white border-slate-200 focus:ring-primary/20 transition-all" 
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] text-slate-600 font-semibold h-12">Dataset</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">#Tables</TableHead>
              <TableHead className="w-[220px] text-slate-600 font-semibold h-12">Total Size</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">Delayed</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold h-12">Expiring</TableHead>
              <TableHead className="text-slate-600 font-semibold h-12">Last Modified</TableHead>
              <TableHead className="text-slate-600 font-semibold h-12">Service</TableHead>
              <TableHead className="text-right text-slate-600 font-semibold h-12 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow key={dataset.name} className="group hover:bg-slate-50/80 transition-colors">
                <TableCell className="font-semibold text-slate-900 py-4 px-4">{dataset.name}</TableCell>
                <TableCell className="text-center text-slate-600">{dataset.tables}</TableCell>
                <TableCell className="py-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center pr-4">
                      <span className="text-xs font-bold text-slate-700">{dataset.size}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden max-w-[160px]">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(dataset.sizeBytes / maxSize) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  {dataset.delayed > 0 ? (
                    <Badge
                      variant="secondary"
                      className="bg-orange-50 text-orange-700 border-orange-100 font-medium"
                    >
                      {dataset.delayed}
                    </Badge>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-4">
                  {dataset.expiring > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50/50 text-amber-700 font-medium"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {dataset.expiring}
                      </div>
                    </Badge>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-500 text-xs py-4">
                  {dataset.lastModified}
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant="outline"
                    className="font-normal text-slate-600 bg-white border-slate-200"
                  >
                    {dataset.service}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-4 pr-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-primary/10 hover:text-primary font-bold transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => onViewDetail(dataset.name)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {datasets.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">
                        No datasets found matching your search criteria
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

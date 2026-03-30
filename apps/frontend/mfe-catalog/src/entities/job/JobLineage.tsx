import React, { useEffect, useState } from "react";
import {
  Clock,
  Zap,
  Dumbbell,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Network,
} from "lucide-react";
import { JobDetail } from "../../shared/types/job";
import { Card, CardContent } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { Badge } from "../../shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { useMfeNavigate } from "../../shared/lib/navigation";
import { JobLineageLayout } from "./JobLineageLayout";
import {
  InputTableInfo,
  OutputTableInfo,
  JobHealthData,
  JobLineageHybridResponse,
  LineageGraphData,
} from "../../shared/api/types/lineage";
import { useApiClient } from "../../shared/api/ApiContext";

interface JobLineageProps {
  job: JobDetail;
  loading?: boolean;
}

export const JobLineage: React.FC<JobLineageProps> = ({ job, loading }) => {
  const navigate = useMfeNavigate();
  const api = useApiClient();
  const [isFetching, setIsFetching] = useState(false);
  const [health, setHealth] = useState<JobHealthData | null>(null);
  const [lineage, setLineage] = useState<JobLineageHybridResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job?.job_id) {
      // Fetch Health and Lineage in parallel
      const fetchData = async () => {
        setIsFetching(true);
        try {
          const [healthResult, lineageResult] = await Promise.allSettled([
            api.fetchJobHealth(job.job_id),
            api.fetchJobLineageHybrid(job.job_id),
          ]);
          if (healthResult.status === "fulfilled") {
            setHealth(healthResult.value.health);
          }
          if (lineageResult.status === "fulfilled") {
            setLineage(lineageResult.value);
          }
        } catch (err) {
          console.error("Failed to fetch lineage data", err);
          setError("Failed to load lineage data.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchData();
    }
  }, [job?.job_id]);

  if (loading || isFetching) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Helper for status badge
  const getStatusVariant = (s?: string) => {
    if (!s) return "secondary";
    const statusVal = s.toUpperCase();
    if (statusVal.includes("SUCCESS")) return "default";
    if (statusVal.includes("FAILED") || statusVal.includes("ERROR")) return "destructive";
    return "secondary";
  };

  // 1. Health Panel (Compact Single Bar)
  const HealthPanel = (
    <Card className="border-slate-200/60 shadow-sm bg-white mb-4">
      <CardContent className="p-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 mr-2">
          <Activity className="w-5 h-5 text-amber-500 fill-amber-100" />
          <span className="font-semibold text-slate-800 text-base">Health</span>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-6 flex-1 flex-wrap">
          {/* Freshness Group */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Updated</span>
              <span className="font-mono font-medium text-slate-900">
                {health?.health?.freshness?.last_updated || "-"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">SLA</span>
              <span className="font-mono text-slate-600">
                {health?.health?.freshness?.sla || "-"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Delay</span>
              <span
                className={`font-mono font-bold ${(health?.health?.freshness?.delay || 0) > 0 ? "text-red-600" : "text-slate-700"}`}
              >
                {health?.health?.freshness?.delay || 0}m
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

          {/* Last Run Group */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Last</span>
              <Badge
                variant={getStatusVariant(health?.health?.last_run?.result)}
                className="h-5 px-1.5 text-[10px] font-bold"
              >
                {health?.health?.last_run?.result || "UNKNOWN"}
              </Badge>
            </div>
            {health?.health?.last_run?.duration && (
              <span className="text-xs text-slate-400 font-mono">
                ({health?.health?.last_run?.duration})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

          {/* Execution Group */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Mode</span>
              <span className="font-medium text-slate-900">
                {health?.health?.execution?.mode || "-"}
              </span>
            </div>
            {health?.health?.execution?.partition && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Partition:</span>
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-600">
                  {health?.health?.execution?.partition}
                </code>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const InputPanel = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        <span className="font-semibold text-sm text-slate-700">
          Upstream Inputs ({lineage?.inputs?.length || 0})
        </span>
      </div>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="h-8 py-2 text-left">Table</TableHead>
              <TableHead className="w-[100px] h-8 py-2 text-right">Read</TableHead>
              <TableHead className="w-[100px] h-8 py-2 text-right">Qual</TableHead>
              <TableHead className="w-[120px] text-right h-8 py-2">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineage?.inputs?.map((input) => (
              <TableRow
                key={input.id}
                className="cursor-pointer hover:bg-slate-50/50"
                onClick={() => navigate(`/tables/${encodeURIComponent(input.name)}`)}
              >
                <TableCell className="font-medium py-2">
                  <div className="truncate max-w-[400px]" title={input.name}>
                    {input.name}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-normal bg-blue-50 text-blue-700 border-blue-200 inline-flex"
                  >
                    {input.read_mode}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <div className="inline-flex justify-end w-full">
                    {input.quality_status === "PASS" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : input.quality_status === "FAIL" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-600 py-2">
                  {input.freshness || "-"}
                </TableCell>
              </TableRow>
            ))}
            {(!lineage?.inputs || lineage.inputs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400 italic h-24">
                  No upstream inputs
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const OutputPanel = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
        <span className="font-semibold text-sm text-slate-700">
          Downstream Outputs ({lineage?.outputs?.length || 0})
        </span>
      </div>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="h-8 py-2 text-left">Table</TableHead>
              <TableHead className="w-[100px] h-8 py-2 text-right">Write</TableHead>
              <TableHead className="w-[100px] h-8 py-2 text-right">Users</TableHead>
              <TableHead className="w-[120px] text-right h-8 py-2">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineage?.outputs?.map((output) => (
              <TableRow
                key={output.id}
                className="cursor-pointer hover:bg-slate-50/50"
                onClick={() => navigate(`/tables/${encodeURIComponent(output.name)}`)}
              >
                <TableCell className="font-medium py-2">
                  <div className="truncate max-w-[400px]" title={output.name}>
                    {output.name}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-normal bg-teal-50 text-teal-700 border-teal-200 inline-flex"
                  >
                    {output.write_mode}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 inline-block">
                    {output.consumer_count}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-600 py-2">
                  {/* API does not provide updated time for outputs yet, using placeholder or other metric */}
                  -
                </TableCell>
              </TableRow>
            ))}
            {(!lineage?.outputs || lineage.outputs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400 italic h-24">
                  No downstream outputs
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const GraphPanel = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
      <div className="bg-white p-6 rounded-full shadow-sm mb-4">
        <Network className="w-12 h-12 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-600 mb-2">Interactive Lineage Graph</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
        Visualize dependencies and data flow for this job. Current graph contains{" "}
        {lineage?.graph?.nodes?.length || 0} nodes and {lineage?.graph?.edges?.length || 0} edges.
      </p>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => navigate(`/lineage/job:${encodeURIComponent(job.job_id)}`)}
      >
        <Network className="w-4 h-4" />
        Open Graph Explorer
      </Button>
    </div>
  );

  return (
    <JobLineageLayout
      // Header removed as per request
      healthPanel={HealthPanel}
      inputPanel={InputPanel}
      outputPanel={OutputPanel}
      graphPanel={GraphPanel}
    />
  );
};

// Basic Lineage Types (Legacy)
export interface LineageNode {
  id: string;
  type: string;
  name: string;
  job_id?: string | null;
  full_name?: string | null;
  owners?: string[];
  status?: string | null;
  enabled?: boolean | null;
}

export interface LineageEdge {
  source: string;
  target: string;
  io?: string | null;
}

export interface LineageGraphData {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

// Health API Types
export interface FreshnessInfo {
  last_updated: string;
  sla: string;
  delay?: number | null;
}

export interface LastRunInfo {
  result: string;
  duration: string;
  ended_at: string;
}

export interface ExecutionInfo {
  mode: string;
  partition?: string | null;
}

export interface JobHealthData {
  freshness: FreshnessInfo;
  last_run: LastRunInfo;
  execution: ExecutionInfo;
}

export interface JobHealthResponse {
  job_id: string;
  updated_at: string;
  health: JobHealthData;
}

// Hybrid Lineage API Types
export interface InputTableInfo {
  id: string;
  name: string;
  storage_type?: string;
  read_mode?: string;
  freshness?: string | null;
  quality_status?: string | null;
  row_count?: number | null;
  owner?: string | null;
  criticality?: string | null;
}

export interface OutputTableInfo {
  id: string;
  name: string;
  storage_type?: string;
  write_mode?: string;
  recent_volume?: number | null;
  consumer_count: number;
  sla_status?: string | null;
}

export interface JobLineageHybridResponse {
  job_id: string;
  inputs: InputTableInfo[];
  outputs: OutputTableInfo[];
  graph: LineageGraphData;
}

// Impact Analysis API Types
export interface ImpactDownstreamEntry {
  depth: number;
  table: string;
  writer_jobs: string[];
  description?: string;
}

export interface ImpactAnalysisSummary {
  total_depth: number;
  total_downstream_tables: number;
  total_writer_jobs: number;
}

export interface ImpactAnalysisResponse {
  base_table: string;
  downstream: ImpactDownstreamEntry[];
  summary: ImpactAnalysisSummary;
}

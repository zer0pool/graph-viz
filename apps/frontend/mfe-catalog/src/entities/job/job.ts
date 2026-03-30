export interface Job {
  job_id: string;
  node_id?: number;
  job_name?: string;
  running_status?: string;
  owner?: string;
  project_id?: string;
  enabled?: boolean;
  updated_at?: string | null;
}

export interface JobNodeRelation {
  id?: string;
  name: string;
  full_name?: string;
  type: string;
  dependency_type?: "HARD" | "SOFT";
}

export interface JobDetail {
  id: string;
  job_id?: string;
  name: string;
  status: string;
  schedule?: string;
  owner?: string;
  description?: string;
  last_run_time?: string;
  next_run_time?: string;
  type?: string;
  lifecycle_status?: string;
  properties?: Record<string, any>;
  labels?: Record<string, string>;
  project_id?: string;
  project_name?: string;
  run_summary?: {
    success: number;
    failed: number;
    running: number;
    total: number;
  };
  upstreams?: JobNodeRelation[];
  downstreams?: JobNodeRelation[];
}

export interface JobRun {
  run_id: string;
  job_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  triggered_by?: string;
}

export interface JobRunHistoryResponse {
  runs: JobRun[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobRankingItem {
  jobId: string;
  type: string;
  valueYesterday: number;
  value7dAvg: number;
  changePct: number;
  history7d: number[];
}

export interface JobListItem {
  job_id: string;
  dag_id: string;
  project_id?: string;
  type: string;
  destination: string;
  owners: string[];
  issuer: string;
  start_time: string;
  next_start_time: string;
  period: string;
  date: string;
  hour: string;
  publish_time: string;
  status?: string;
  duration?: number;
  progress?: number;
  job_name?: string;
}

export interface Job {
  job_id: string;
  node_id?: number;
  job_name?: string;
  running_status?: string;
  owners?: string[];
  project_id?: string;
  enabled?: boolean;
  updated_at?: string | null;
  duration?: number;        // seconds running
  progress?: number;        // 0-1 fraction
  
  // Job Run fields
  dag_id?: string;
  type?: string;
  destination?: string;
  issuer?: string;
  start_time?: string;
  next_start_time?: string;
  period?: string;
  date?: string;
  hour?: string;
  publish_time?: string;
}

export interface JobNodeRelation {
  id?: string;
  name: string;
  full_name?: string;
  type: string;
  dependency_type?: "HARD" | "SOFT";
  storage?: string;
  write_mode?: string;
}

export interface JobDetail {
  id: string;
  job_id?: string;
  name: string;
  status: string;
  schedule?: string;
  owner?: string;
  owners?: string[];
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
  duration_sec?: number;
  elapsed?: number;
  triggered_by?: string;
}

export interface JobRunHistoryResponse {
  timeline: JobRun[];
  summary: {
    total: number;
    running: number;
    success: number;
    failed: number;
  };
  total: number;
  page: number;
  page_size: number;
}

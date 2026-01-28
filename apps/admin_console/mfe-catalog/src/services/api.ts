import { AuthClient } from "../types/auth";
import { JobDetail, JobRunHistoryResponse } from "../types/job";
import {
  TableDetail,
  TableSchemaResponse,
  TableTimelinessResponse,
} from "../types/table";

export class ApiClient {
  private auth: AuthClient;
  private baseUrl: string;

  constructor(auth: AuthClient, baseUrl: string = "") {
    this.auth = auth;
    this.baseUrl = baseUrl;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const res = await this.auth.fetchWithAuth(fullUrl, options);

    if (!res.ok) {
      throw new Error(`API Request failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.result !== undefined ? data.result : data;
  }

  // --- Job Endpoints ---

  async fetchJobDetail(jobId: string): Promise<JobDetail> {
    return this.request<JobDetail>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  async fetchJobRunHistory(jobId: string): Promise<JobRunHistoryResponse> {
    return this.request<JobRunHistoryResponse>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/run-history`
    );
  }

  // --- Table Endpoints ---

  async fetchTableDetail(tableName: string): Promise<TableDetail> {
    const raw = await this.request<any>(
      `/api/v1/tables/${encodeURIComponent(tableName)}/detail`
    );

    // Map Backend Response to Frontend Interface
    return {
      id: raw.full_name || tableName,
      name: raw.full_name || tableName,
      description: raw.description,
      owner: raw.labels?.owner, // Assuming owner might come from labels, or add logic if separate
      created_at: raw.created,
      updated_at: raw.modified || raw.updated,
      labels: raw.labels,
      storage_info: {
        type: raw.table_type,
        location: raw.location,
        format: "BigQuery", // or derived from type
        size_bytes: raw.storage?.num_bytes,
        row_count: raw.storage?.num_rows,
        partitioning: raw.storage?.partitioning,
        clustering: raw.storage?.clustering,
      },
    };
  }

  async fetchTableSchema(tableName: string): Promise<TableSchemaResponse> {
    return this.request<TableSchemaResponse>(
      `/api/v1/tables/${encodeURIComponent(tableName)}/schema`
    );
  }

  async fetchTableTimeliness(
    tableName: string,
    days: number = 7
  ): Promise<any> {
    const params = new URLSearchParams({ days: String(days) });
    return this.request<any>(
      `/api/v1/tables/${encodeURIComponent(
        tableName
      )}/timelines?${params.toString()}`
    );
  }

  async fetchTableLineageSummary(
    tableName: string,
    options: { maxRoots?: number; maxLeaves?: number } = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options.maxRoots) params.set("max_roots", String(options.maxRoots));
    if (options.maxLeaves) params.set("max_leaves", String(options.maxLeaves));

    const queryString = params.toString();
    const url = `/api/v1/tables/${encodeURIComponent(
      tableName
    )}/lineage-summary${queryString ? `?${queryString}` : ""}`;
    return this.request(url);
  }

  // --- Graph/Generic Endpoints ---

  // TODO: Add other methods as needed: fetchNeighbors, expand, etc.
}

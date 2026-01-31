import { EVENT_ID_STORAGE_KEY, BASE_URL } from "../config.js";



export class ApiClient {
  constructor(authClient, baseUrl = null) {
    this.authClient = authClient;
    this.baseUrl = baseUrl || BASE_URL;
  }

  async request(url, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[Api] ${options.method || "GET"} ${fullUrl}`);
    
    // In BFF mode, we just use the authClient's fetch wrapper which handles 401s,
    // or we can just use native fetch as cookies are automatic.
    if (this.authClient && this.authClient.fetchWithAuth) {
      return this.authClient.fetchWithAuth(fullUrl, options);
    }
    return fetch(fullUrl, options);
  }

  async fetchSuggestions(query, limit = 10) {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });
    const res = await this.request(`/api/v1/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
    return res.json();
  }

  async fetchNeighbors(kind, value, depth) {
    const url = `/api/v1/graph/${kind}/${encodeURIComponent(value)}/neighbors?level=${depth}`;
    const res = await this.request(url);
    if (!res.ok) throw new Error(`Neighbors failed: ${res.status}`);
    return res.json();
  }

  async expand(params) {
    const query = new URLSearchParams(params);
    const res = await this.request(`/api/v1/graph/expand?${query.toString()}`);
    if (!res.ok) throw new Error(`Expand failed: ${res.status}`);
    return res.json();
  }

  async syncNode(payload) {
    return this.request(`/api/v1/graph/sync/node`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async fetchTableTriggers(tableName) {
    const res = await this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/triggers`);
    if (!res.ok) throw new Error(`Trigger load failed: ${res.status}`);
    return res.json();
  }

  async patchTableTrigger(tableName, jobId, trigger) {
    return this.request(
      `/api/v1/tables/${encodeURIComponent(tableName)}/triggers/${encodeURIComponent(jobId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger }),
      }
    );
  }

  async bulkDisableTriggers(tableName) {
    return this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/triggers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: false }),
    });
  }

  async fetchTableTimeliness(tableName, days = 7) {
    const res = await this.request(
      `/api/v1/tables/${encodeURIComponent(tableName)}/timelines?days=${encodeURIComponent(days)}`
    );
    if (!res.ok) throw new Error(`Timeliness failed: ${res.status}`);
    return res.json();
  }

  async fetchTableDetails(tableName) {
    const res = await this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/details`);
    if (!res.ok) throw new Error(`Table details fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchTableSchema(tableName) {
    const res = await this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/schema`);
    if (!res.ok) throw new Error(`Table schema failed: ${res.status}`);
    return res.json();
  }

  async fetchTableLineageSummary(tableName, { maxRoots, maxLeaves } = {}) {
    const params = new URLSearchParams();
    if (Number.isFinite(maxRoots)) params.set("max_roots", String(maxRoots));
    if (Number.isFinite(maxLeaves)) params.set("max_leaves", String(maxLeaves));
    const query = params.toString();
    const url = `/api/v1/tables/${encodeURIComponent(tableName)}/lineage-summary${query ? `?${query}` : ""}`;
    const res = await this.request(url);
    if (!res.ok) throw new Error(`Lineage summary failed: ${res.status}`);
    return res.json();
  }

  async fetchTableHierarchy(tableName) {
    const res = await this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/hierarchy`);
    if (!res.ok) throw new Error(`Hierarchy fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchBatchDetails(nodeIds) {
    const res = await this.request(`/api/v1/lineage/batch-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_ids: nodeIds }),
    });
    if (!res.ok) throw new Error(`Batch details failed: ${res.status}`);
    return res.json();
  }

  async fetchJobDetail(jobId) {
    const res = await this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error(`Job detail failed: ${res.status}`);
    return res.json();
  }

  async fetchJobRunHistory(jobId) {
    const res = await this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}/run-history`);
    if (!res.ok) throw new Error(`Run history failed: ${res.status}`);
    return res.json();
  }

  async fetchConfig() {
    const res = await this.request(`/api/v1/auth/config`);
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchProfile() {
    const res = await this.request(`/api/v1/auth/me`);
    if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
    return res.json();
  }
}

export function rememberEventId(id) {
  if (id) sessionStorage.setItem(EVENT_ID_STORAGE_KEY, String(id));
}

export function readLastEventId() {
  const raw = sessionStorage.getItem(EVENT_ID_STORAGE_KEY);
  return raw ? Number(raw) : null;
}

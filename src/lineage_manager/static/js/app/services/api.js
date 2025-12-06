import { EVENT_ID_STORAGE_KEY, BASE_URL } from "../config.js";



export class ApiClient {
  constructor(authClient) {
    this.authClient = authClient;
    this.baseUrl = BASE_URL;
  }

  async request(url, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`;
    return this.authClient.fetchWithAuth(fullUrl, options);
  }

  async fetchSuggestions(query) {
    const res = await this.request(`/api/v1/search/suggest?q=${encodeURIComponent(query)}`);
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
      `/api/v1/tables/${encodeURIComponent(tableName)}/timeliness?days=${encodeURIComponent(days)}`
    );
    if (!res.ok) throw new Error(`Timeliness failed: ${res.status}`);
    return res.json();
  }

  async fetchJobRunHistory(jobId) {
    const res = await this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}/run-history`);
    if (!res.ok) throw new Error(`Run history failed: ${res.status}`);
    return res.json();
  }

  async fetchStateHash() {
    const res = await this.request(`/api/v1/events/state-hash`);
    if (!res.ok) throw new Error("state hash failed");
    return res.json();
  }

  async fetchConfig() {
    const res = await this.request(`/api/v1/auth/config`);
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
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

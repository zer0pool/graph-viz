import { EVENT_ID_STORAGE_KEY, BASE_URL } from "../config.js";



export class ApiClient {
  constructor(authClient) {
    this.authClient = authClient;
    this.baseUrl = BASE_URL;
  }

  async request(url, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`;
    console.debug(`[Api] ${options.method || "GET"} ${fullUrl}`);
    return this.authClient.fetchWithAuth(fullUrl, options);
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
      `/api/v1/tables/${encodeURIComponent(tableName)}/timeliness?days=${encodeURIComponent(days)}`
    );
    if (!res.ok) throw new Error(`Timeliness failed: ${res.status}`);
    return res.json();
  }

  async fetchTableDetail(tableName) {
    const res = await this.request(`/api/v1/tables/${encodeURIComponent(tableName)}/detail`);
    if (!res.ok) throw new Error(`Table detail failed: ${res.status}`);
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

  async fetchJobDetail(jobId) {
    console.debug(`[Api] GET /api/v1/jobs/${jobId}`);
    const res = await this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error(`Job detail failed: ${res.status}`);
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
    console.debug("[Api] GET /api/v1/auth/config");
    const res = await this.request(`/api/v1/auth/config`);
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    return res.json();
  }

  async exchangeAuthorizationCode(code, verifier) {
    const fullUrl = `${this.baseUrl}/api/v1/auth/exchange`;
    console.info("[Api] POST /api/v1/auth/exchange");
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier }),
    });
    if (!res.ok) {
      console.error("[Api] Authorization code exchange failed", res.status);
      throw new Error(`Exchange failed: ${res.status}`);
    }
    const payload = await res.json();
    console.info("[Api] Authorization code exchange succeeded");
    return payload;
  }

  async fetchProfile() {
    console.debug("[Api] GET /api/v1/users/me");
    const res = await this.request(`/api/v1/users/me`);
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

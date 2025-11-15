import { EVENT_ID_STORAGE_KEY } from "../config.js";
import { rememberEventId, readLastEventId } from "./api.js";

export class EventService {
  constructor({ api, graph, panel, searchState, filterState }) {
    this.api = api;
    this.graph = graph;
    this.panel = panel;
    this.searchState = searchState;
    this.filterState = filterState;
    this.stream = null;
    this.pollHandle = null;
    this.pollIntervalMs = 15000;
    this.currentHash = sessionStorage.getItem(EVENT_ID_STORAGE_KEY) || null;
  }

  start() {
    this.attachStream();
    this.startPolling();
  }

  stop() {
    this.detachStream();
    this.stopPolling();
    sessionStorage.removeItem(EVENT_ID_STORAGE_KEY);
    this.currentHash = null;
  }

  attachStream() {
    this.detachStream();
    if (!window.authClient?.isAuthenticated()) return;
    const token = window.authClient.getIdToken();
    if (!token) return;
    const url = new URL("/api/v1/events/trigger-status", window.location.origin);
    url.searchParams.set("access_token", token);
    const last = readLastEventId();
    if (last) url.searchParams.set("lastEventId", String(last));
    this.stream = new EventSource(url.toString());
    this.stream.addEventListener("trigger_update", (evt) => this.handleTrigger(evt));
    this.stream.addEventListener("replay_unavailable", () => this.forceResync());
    this.stream.onerror = () => {
      this.detachStream();
      setTimeout(() => this.attachStream(), 2000);
    };
  }

  detachStream() {
    if (this.stream) {
      this.stream.close();
      this.stream = null;
    }
  }

  handleTrigger(evt) {
    rememberEventId(evt.lastEventId);
    this.currentHash = evt.lastEventId || this.currentHash;
    try {
      const data = JSON.parse(evt.data || "{}");
      if (!data.job_id) return;
      document.querySelectorAll(`.trigger-toggle[data-job="${data.job_id}"]`).forEach((input) => {
        input.checked = !!data.new_state;
      });
    } catch (err) {
      // ignore malformed payload
    }
  }

  forceResync() {
    this.runPoll(true);
    this.attachStream();
  }

  startPolling() {
    this.stopPolling();
    this.runPoll();
  }

  stopPolling() {
    if (this.pollHandle) {
      clearTimeout(this.pollHandle);
      this.pollHandle = null;
    }
  }

  async runPoll(force = false) {
    if (!window.authClient?.isAuthenticated()) {
      this.scheduleNextPoll();
      return;
    }
    try {
      const payload = await this.api.fetchStateHash();
      if (payload.poll_interval_ms) this.pollIntervalMs = Number(payload.poll_interval_ms);
      if (payload.last_event_id) rememberEventId(payload.last_event_id);
      const newHash = payload.hash || String(payload.last_event_id || "");
      if (force || (this.currentHash && newHash && newHash !== this.currentHash)) {
        await this.replayLastQuery();
      }
      this.currentHash = newHash;
    } catch (err) {
      // ignore transient errors
    } finally {
      this.scheduleNextPoll();
    }
  }

  scheduleNextPoll() {
    this.stopPolling();
    this.pollHandle = setTimeout(() => this.runPoll(), this.pollIntervalMs);
  }

  async replayLastQuery() {
    const last = this.searchState.lastQuery;
    if (!last) return;
    try {
      const payload = await this.api.fetchNeighbors(last.type, last.value, this.filterState.depth);
      this.graph.renderGraph(payload);
    } catch (err) {
      console.warn("Failed to replay last query", err);
    }
  }
}

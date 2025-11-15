Title: SSE Replay & Polling Guard (11)

Summary
- Adds event buffering + replay support to the SSE channel so reconnecting tabs can request missed events.
- Persists last received event ID on the frontend and reconnects with `?lastEventId=` to resume streams.
- Adds a `/api/v1/events/state-hash` polling API plus frontend watchdog that re-syncs the graph when mismatches are detected.

Backend Changes
- `.env.example`, `Settings`: new `SSE_BUFFER_SIZE` and `EVENT_POLL_INTERVAL_MS` knobs.
- `src/graph_manager/core/sse.py`
  - Broker now assigns monotonically increasing `event_id`, stores a ring-buffer, and emits `replay_unavailable` control events when the requested ID aged out.
  - Exposes `snapshot()` for diagnostics/state-hash endpoint.
- `src/graph_manager/api/v1/endpoints/events.py`
  - `/trigger-status` accepts `lastEventId` query param and replays buffered events.
  - New `/state-hash` endpoint returns health stats, last event id, buffer metadata, hash, and server-advertised polling interval.

Frontend Changes
- `src/graph_manager/static/index.html`
  - Adds `data-poll-interval` attribute for default polling cadence.
- `src/graph_manager/static/js/main.js`
  - Stores the last SSE `event.id` in `sessionStorage` (`lm.lastEventId`) and appends it to reconnect URLs.
  - Handles `replay_unavailable` events by triggering a manual poll + stream refresh.
  - Introduces a resilient polling loop (`/api/v1/events/state-hash`) that compares hashes/lastEventId and, when diverged, re-fetches the active graph query.
  - Polling interval auto-adjusts based on backend response; timers pause when the user logs out.
  - Logout clears cached event IDs & polling timers to avoid leaking work between sessions.

Usage Notes
- Default buffer depth is 512 events; adjust via `SSE_BUFFER_SIZE`.
- Polling interval defaults to 15s and can be tuned with `EVENT_POLL_INTERVAL_MS`.
- The fallback poll re-runs the last successful search (if any) to realign the topology when events are missed.

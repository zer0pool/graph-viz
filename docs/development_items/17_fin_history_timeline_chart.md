# 17. Financial Timeliness Timeline – Implementation Notes

## Status
✅ Timeliness API stub and two-stage chart UI (Daily summary + Hourly breakdown) have been delivered for the table detail panel.

## Backend (`src/lineage_manager/api/v1/endpoints/tables.py`)
- Added `GET /api/v1/tables/{table_name}/timeliness?days=7` which returns dummy `daily_summary` and `hourly_detail` payloads after a guaranteed 1 s delay.  
- Response structure follows the design doc: `{ status, input, result: { daily_summary, hourly_detail } }`.  
- Daily rows include `date`, `success_count`, `fail_count`, `status`, `rate`; hourly rows include `hour`, `state`, interval timestamps.

## Frontend
- Loaded Apache ECharts globally to power the new visualizations.
- Added a third tab (`Load timeline v2`) inside the table detail card (`index.html`) with markup for the chart containers, placeholders, and descriptive comments.
- Introduced `TableTimelinessView` (`static/js/app/ui/timelinessView.js`) to encapsulate chart rendering, loading/error states, and selection handling.  
  - Renders horizontal status bars for daily summary with success/failure tooltips.  
  - Renders a single-row segmented bar for 24 hourly states using a custom ECharts series.  
  - Exposes `reset`, `setLoading`, `renderDaily`, `renderHourly`, `setSelectedDate`, and `onDaySelected` helpers plus automatic resizing.
- `PanelController` now wires the new tab:
  - Stores timeliness fetch state, listens for tab switches, and calls the API via `ApiClient.fetchTableTimeliness`.  
  - Keeps hourly results in memory, refreshes charts when the user selects a day, and logs failures in the console.  
  - Detail panel resize events (`detail-panel:resized`) trigger chart `resize()` so the graphs stay sharp while dragging the resizer.
- CSS (`modern-console.css`) gained styles for the timeliness cards, placeholders, and chart sizing to match the GCP lineage explorer feel.

## UX Behavior
1. Select a table node → metadata + Trigger Jobs render as before.  
2. Open **Load timeline v2** → spinner shows while fetching timeliness data.  
3. Daily summary blocks appear; hourly section prompts the user to click a day.  
4. Clicking a block highlights it and renders the hourly segmented bar.  
5. Resizing or collapsing the detail drawer keeps charts responsive via the new resize events.

### 2024-11-20 Enhancements
- Re-skinned the daily summary into a single-row timeline so each day renders as one contiguous pill with inline labels (mirrors the GCP explorer mock).  
- Added a legend for “Loaded / Missing” states plus a refined tooltip that always shows the day’s data interval even when backend data omits it.  
- Hourly breakdown now always paints 24 segments; gaps are shown as gray “No data” cells whose tooltips still reveal the expected hour interval so users understand what would load there.  
- When hourly data is absent the chart still appears, giving visual continuity instead of falling back to text placeholders.

## Follow-ups
- Replace dummy API values with real timeliness metrics when backend data is available.  
- Extend the hourly detail map to include all returned days for richer exploration.  
- Consider persisting the last selected day per table to the backend/session if needed.

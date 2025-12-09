
# Run History Panel — Full Design Specification

## 1. Overview
Complete UI/UX, API, and implementation specification for the Lineage Manager Run History Panel.

## 2. Detailed Mock‑up (High‑Resolution ASCII)

```
┌─────────────────────────── Right Detail Panel ───────────────────────────┐
│  RUN HISTORY                                                             │
│                                                                          │
│  Timeline                                                                │
│   ●──────●────●────●●──────────────────────●────────●                    │
│                                                                          │
│  Compact Table                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ STATUS     START                  DURATION        DETAILS          │  │
│  │ success    2025-11-29 02:00       1860s           View →           │  │
│  │ failed     2025-11-28 03:00       1920s           View →           │  │
│  │ success    2025-11-27 04:00       1980s           View →           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


Drawer (Details):

┌────────────────────────────── Run Detail Drawer ──────────────────────────────┐
│ Run ID: scheduled__2025-11-28T03:00:00                                         │
│ Status: failed                                                                 │
│ Triggered by: schedule                                                         │
│ Start: 2025-11-28T03:00:00                                                     │
│ End:   2025-11-28T03:32:05                                                     │
│ Duration: 1920s                                                                │
│ Error Message:                                                                 │
│   BigQuery timeout while scanning daily partition...                           │
│                                                                                │
│ [Close]                                                                         │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Figma‑Style Wireframe

```
FRAME: Right Detail Panel
│
├─ HEADER: "Run History"
│
├─ SECTION: TimelineRow
│     - Horizontal bar
│     - Dots colored by status
│     - Hover tooltip
│
├─ SECTION: CompactTable
│     Columns:
│        • Status (badge)
│        • Start
│        • Duration
│        • Details (button)
│
└─ DRAWER: RunDetailsDrawer (slides from right)
        • Run ID
        • Status
        • Triggered By
        • Start / End
        • Duration
        • Error Message (multiline)
```

## 4. Implementation — HTML

```html
<div id="run-history">
  <h3>Run History</h3>

  <div id="timeline" style="height:60px;"></div>

  <table class="history-table">
    <thead>
      <tr>
        <th>Status</th>
        <th>Start</th>
        <th>Duration</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="run-history-body"></tbody>
  </table>
</div>

<div id="run-detail-drawer" class="drawer hidden">
  <div class="drawer-content">
    <h4>Run Details</h4>
    <div id="drawer-fields"></div>
    <button id="drawer-close">Close</button>
  </div>
</div>
```

## 5. CSS

```css
#run-history { padding: 8px; }

.history-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #eee;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100%;
  background: white;
  box-shadow: -4px 0 10px rgba(0,0,0,0.1);
  transform: translateX(100%);
  transition: transform .25s ease;
}

.drawer.open {
  transform: translateX(0);
}
```

## 6. JS — Table + Drawer Logic

```js
export class RunHistoryPanel {
  constructor(api) {
    this.api = api;
    this.body = document.getElementById("run-history-body");
    this.drawer = document.getElementById("run-detail-drawer");
    this.drawerFields = document.getElementById("drawer-fields");
    this.timelineEl = document.getElementById("timeline");
  }

  async load(jobId) {
    const data = await this.api.getRunHistory(jobId);
    this.renderTable(data.runs);
    this.renderTimeline(data.runs);
  }

  renderTable(runs) {
    this.body.innerHTML = "";
    for (const r of runs) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="status ${r.status}">${r.status}</td>
        <td>${r.start_time}</td>
        <td>${r.duration_sec || "-"}</td>
        <td><button class="view-btn">View</button></td>
      `;
      tr.querySelector(".view-btn").onclick = () => this.openDrawer(r);
      this.body.appendChild(tr);
    }
  }

  openDrawer(run) {
    this.drawerFields.innerHTML = `
      <div><b>Run ID:</b> ${run.run_id}</div>
      <div><b>Status:</b> ${run.status}</div>
      <div><b>Triggered By:</b> ${run.trigger}</div>
      <div><b>Start:</b> ${run.start_time}</div>
      <div><b>End:</b> ${run.end_time || "-"}</div>
      <div><b>Duration:</b> ${run.duration_sec || "-"}</div>
      <div><b>Error Message:</b><br>${run.error_message || "-"}</div>
    `;
    this.drawer.classList.add("open");
  }
}
document.getElementById("drawer-close").onclick =
  () => document.getElementById("run-detail-drawer").classList.remove("open");
```

## 7. ECharts Timeline Code

```js
import * as echarts from "echarts";

renderTimeline(runs) {
  const chart = echarts.init(this.timelineEl);

  const points = runs.map((run, idx) => ({
    value: idx,
    itemStyle: {
      color:
        run.status === "success" ? "#1a8917" :
        run.status === "failed"  ? "#d93025" :
        run.status === "running" ? "#1a73e8" : "#999"
    },
    run
  }));

  chart.setOption({
    xAxis: { type: "category", show: false, data: runs.map((_, i) => i) },
    yAxis: { show: false },
    series: [{
      type: "scatter",
      data: points,
      symbolSize: 12
    }],
    tooltip: {
      formatter: p => {
        const r = p.data.run;
        return `
          <b>${r.start_time}</b><br>
          Status: ${r.status}<br>
          Duration: ${r.duration_sec || "-"}s
        `;
      }
    }
  });
}
```

## 8. API Specification

### **GET /api/v1/jobs/{job_id}/run-history**

#### Query Params
- `limit` (default: 20)  
- `offset` (default: 0)

#### Response

```json
{
  "job_id": "daily_sales_summary",
  "runs": [
    {
      "run_id": "scheduled__2025-11-28T03:00:00",
      "status": "failed",
      "trigger": "schedule",
      "start_time": "2025-11-28T03:00:00Z",
      "end_time": "2025-11-28T03:32:05Z",
      "duration_sec": 1920,
      "error_message": "BigQuery timeout..."
    }
  ],
  "total": 337
}
```

---

# END OF DOCUMENT

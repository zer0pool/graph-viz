const STATUS_COLORS = {
  good: "#188038", // GCP Green
  warning: "#E37400", // GCP Orange/Warning
  bad: "#C5221F", // GCP Red
  default: "#9CA3AF",
  unknown: "#F1F3F4",
};

const STATE_COLORS = {
  loaded: "#188038", // GCP Green (status-success)
  success: "#188038",
  missing: "#F1F3F4", // GCP Gray (status-unknown background) - subtle for empty slots
  failed: "#C5221F", // GCP Red (status-error)
  unknown: "#F1F3F4",
  default: "#9CA3AF",
};

const HOUR_LABEL = "Select a day to view hourly detail.";
const DAILY_LOAD_HINT = 'Select "Activity" tab to load timeliness data.';

const formatState = (value) => {
  if (!value) return "Unknown";
  const lower = value.toLowerCase();
  if (lower === "unknown") return "No data";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatDayTick = (dateStr) => {
  if (typeof dateStr !== "string") return "-";
  // Expecting YYYY-MM-DD
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return parts[2];
};

const buildDayInterval = (dateStr) => ({
  start: `${dateStr} 00:00`,
  end: `${dateStr} 23:59`,
});

const buildHourInterval = (dateStr, hourLabel) => ({
  start: `${dateStr} ${hourLabel}:00`,
  end: `${dateStr} ${hourLabel}:59`,
});

export class TableTimelinessView {
  constructor({
    pane,
    dailyChart,
    hourlyChart,
    dailyPlaceholder,
    hourlyPlaceholder,
    hourlyLabel,
  }) {
    this.pane = pane;
    this.dailyChartEl = dailyChart;
    this.hourlyChartEl = hourlyChart;
    this.dailyPlaceholder = dailyPlaceholder;
    this.hourlyPlaceholder = hourlyPlaceholder;
    this.hourlyLabel = hourlyLabel;

    // Bind range selector
    this.rangeSelector = document.getElementById("timeliness-range-selector");
    if (this.rangeSelector) {
      this.rangeSelector.addEventListener("change", (e) => {
        const days = parseInt(e.target.value, 10) || 7;
        if (this.rangeChangeCallback) {
          this.rangeChangeCallback(days);
        }
      });
    }

    this.charts = {
      daily: null,
      hourly: null,
    };

    this.dailyData = [];
    this.selectedDay = null;
    this.daySelectHandler = null;
    this.rangeChangeCallback = null;

    this.customDailyRenderer = (params, api) => this.renderDailySegment(params, api);
    this.customHourlyRenderer = (params, api) => this.renderHourlySegment(params, api);
    this.handleWindowResize = () => this.resize();
    window.addEventListener("resize", this.handleWindowResize);

    // Auto-resize when container changes
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    if (this.pane) this.resizeObserver.observe(this.pane);
  }

  onDaySelected(handler) {
    this.daySelectHandler = handler;
  }

  onRangeChanged(handler) {
    this.rangeChangeCallback = handler;
  }

  // Cleanup if needed
  dispose() {
    window.removeEventListener("resize", this.handleWindowResize);
    this.resizeObserver?.disconnect();
    this.dailyChart?.dispose();
    this.hourlyChart?.dispose();
  }

  reset(message = DAILY_LOAD_HINT) {
    this.dailyData = [];
    this.selectedDay = null;
    this.showDailyPlaceholder(message);
    this.clearHourly();
  }

  setIdle(message) {
    this.reset(message);
  }

  setLoading(message = "Loading timeliness…") {
    this.showDailyPlaceholder(`<span class="spinner"></span>${message}`, { html: true });
    this.clearHourly();
  }

  setError(message = "Failed to load timeliness.") {
    this.showDailyPlaceholder(message);
    this.showHourlyPlaceholder("No hourly data available.");
  }

  setSelectedDate(date) {
    this.selectedDay = date || null;
    if (this.dailyData?.length) {
      this.renderDaily(null, this.selectedDay);
    }
  }

  renderDaily(data = null, selectedDay = this.selectedDay, timeRange = null) {
    if (Array.isArray(data)) {
      this.dailyData = this.normalizeDailyData(data, timeRange);
    }
    // Even if normalized is empty (shouldn't happen if we fill dates), handle check
    if (!Array.isArray(this.dailyData) || !this.dailyData.length) {
      this.showDailyPlaceholder("No timeliness information for this table.");
      return;
    }
    const chart = this.ensureDailyChart();
    if (!chart) {
      this.showDailyPlaceholder("Charts unavailable.");
      return;
    }
    this.hideDailyPlaceholder();
    // Force resize in case it was hidden
    chart.resize();

    this.selectedDay = selectedDay || null;
    const categories = this.dailyData.map((item) => item.date);

    // Map data to series with constant height (1) and color
    const seriesData = this.dailyData.map((item) => {
      let color = STATE_COLORS.missing;
      // Determine color based on status
      if (item.status === 'good' || item.status === 'success') color = STATE_COLORS.success;
      else if (item.status === 'bad' || item.status === 'failed') color = STATE_COLORS.failed;
      else if (item.status === 'warning') color = STATUS_COLORS.warning;

      return {
        value: 1, // Constant height
        itemStyle: {
          color: color,
          barBorderRadius: [4, 4, 0, 0] // Rounded top
        },
        // Pass raw data for tooltip
        data: item
      };
    });

    chart.setOption(
      {
        grid: { left: '4%', right: '4%', top: 10, bottom: 30, containLabel: true },
        xAxis: {
          type: "category",
          data: categories,
          boundaryGap: true,
          axisLine: { lineStyle: { color: "#d1d5db" } },
          axisTick: { alignWithLabel: true, length: 6 },
          axisLabel: {
            color: "#4B5563",
            formatter: (value) => formatDayTick(value),
          },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 1,
          axisLine: { show: false }, // Hide Y axis line
          axisTick: { show: false },
          axisLabel: { show: false }, // Hide Y axis labels (constant height)
          splitLine: { show: false },
        },
        tooltip: {
          trigger: "item",
          confine: true,
          formatter: (params) => {
            const point = params.data?.data || {};
            // If missing, show appropriate tooltip
            if (point.status === 'missing') {
              return `Date: ${point.date}<br/>Status: Missing (No data)`;
            }
            const total = (point.success_count ?? 0) + (point.fail_count ?? 0);
            return [
              `Date: ${point.date || "-"}`,
              `Success: ${point.success_count ?? 0} / ${total || 24}`,
              `Status: ${formatState(point.status)}`,
            ].join("<br/>");
          },
        },
        series: [
          {
            type: "bar",
            barWidth: "60%", // Adjust bar width
            data: seriesData,
            cursor: 'pointer', // Show pointer to indicate clickable
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          },
        ],
      },
      true
    );
  }

  // Ensure we show at least the last 7 days ending Today (or matching the requested range)
  // Logic: 
  // 1. Find 'today' (UTC) or use timeRange.end if provided
  // 2. We want 7 days up to end date. 
  // 3. Merge existing data.
  normalizeDailyData(apiData, timeRange) {
    const map = new Map();
    (apiData || []).forEach(d => map.set(d.date, d));

    const result = [];

    // Determine the anchor date (End of range)
    let endDate = new Date(); // Default to client today
    let daysCount = 7; // Default

    if (timeRange && timeRange.end) {
      // Parse "YYYY-MM-DD" safely
      const parts = timeRange.end.split("-");
      if (parts.length === 3) {
        // Month is 0-indexed in Date constructor
        endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        endDate = new Date(timeRange.end); // Fallback
      }

      // Calculate days count if start is provided
      if (timeRange.start) {
        const startParts = timeRange.start.split("-");
        let startDate;
        if (startParts.length === 3) {
          startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        } else {
          startDate = new Date(timeRange.start);
        }
        // diff in ms
        const diffTime = Math.abs(endDate - startDate);
        // Convert to days (inclusive makes it +1? No, range loop is 0-indexed count)
        // e.g. Dec 11 - Dec 05 = 6 days difference, but covers 7 days?
        // 05, 06, 07, 08, 09, 10, 11 -> 7 items.
        // Math.ceil(diff / day) = 6. So we need i=6 to 0. matching count 7.
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysCount = diffDays + 1;
      }
    }

    // Generate dates back from reference end date
    // i goes from N-1 down to 0
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      // Format YYYY-MM-DD
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (map.has(dateStr)) {
        result.push(map.get(dateStr));
      } else {
        // Missing data entry
        result.push({
          date: dateStr,
          period: "DAY",
          status: "missing",
          success_count: 0,
          fail_count: 0,
          // intervals can be implied
        });
      }
    }
    return result;
  }

  buildDailyPoint(item, index) {
    const interval = buildDayInterval(item.date);
    return {
      value: [item.date, 0],
      rawDate: item.date,
      index,
      dayLabel: formatDayTick(item.date),
      success: item.success_count ?? 0,
      fail: item.fail_count ?? 0,
      status: item.status || "unknown",
      intervalStart: item.interval_start || interval.start,
      intervalEnd: item.interval_end || interval.end,
      color: STATUS_COLORS[item.status] || STATUS_COLORS.default,
      textColor: item.status === "warning" ? "#111827" : "#ffffff",
      selected: this.selectedDay === item.date,
    };
  }

  renderDailySegment(params, api) {
    const data = params?.data || {};
    const fillColor = data.color || STATUS_COLORS.default;
    const strokeColor = data.selected ? "#1A73E8" : "#d1d5db";
    const label = data.dayLabel ?? "";
    const coord = api.coord([api.value(0), api.value(1)]);
    const bandWidth = api.size([1, 0])[0] * 0.9;
    const barHeight = Math.min(api.size([0, 1])[1] * 0.6, 34);
    const x = coord[0] - bandWidth / 2;
    const y = coord[1] - barHeight / 2;
    const radius = 6;
    const children = [
      {
        type: "rect",
        shape: {
          x,
          y,
          width: bandWidth,
          height: barHeight,
          r: radius,
        },
        style: {
          fill: fillColor,
          stroke: strokeColor,
          lineWidth: data.selected ? 2 : 1,
        },
      },
      {
        type: "text",
        style: {
          text: label,
          x: x + bandWidth / 2,
          y: y + barHeight / 2,
          fill: data.textColor || "#ffffff",
          fontWeight: 600,
          fontSize: 12,
          textAlign: "center",
          textVerticalAlign: "middle",
        },
      },
    ];
    return {
      type: "group",
      children,
    };
  }

  renderHourly(date, rows) {
    if (!date) {
      this.clearHourly();
      return;
    }

    // Check if we should show hourly at all based on daily data period
    const dailyItem = (this.dailyData || []).find(d => d.date === date);
    if (dailyItem && dailyItem.period === "DAILY") {
      this.clearHourly();
      // Optionally show message like "Daily frequency - no hourly breakdown"
      // But user asked to just not show it.
      if (this.hourlyChartEl) this.hourlyChartEl.hidden = true;
      if (this.hourlyLabel) this.hourlyLabel.hidden = true;
      return;
    }

    // Ensure visibility
    if (this.hourlyChartEl) this.hourlyChartEl.hidden = false;
    if (this.hourlyLabel) this.hourlyLabel.hidden = false;

    // Use percentage grid to fill width
    // We will draw 24 distinct bars (using custom series or bar series).
    // User wants "Airflow style": distinct colored blocks. 
    // Best way: Standard Bar Chart with gap.

    if (this.hourlyLabel) {
      this.hourlyLabel.textContent = `Hourly breakdown • ${date}`;
    }
    const chart = this.ensureHourlyChart();
    if (!chart) {
      this.showHourlyPlaceholder("Charts unavailable.");
      return;
    }
    // Force resize ensures correct width calculation
    chart.resize();

    const normalized = this.normalizeHourlyRows(date, rows);
    this.hideHourlyPlaceholder();

    // Prepare bar data
    const seriesData = normalized.map(item => {
      let color = STATE_COLORS.missing;
      if (item.state === 'loaded') color = STATE_COLORS.loaded;
      else if (item.state === 'failed') color = STATE_COLORS.failed;
      else if (item.state === 'missing') color = STATE_COLORS.missing;

      return {
        value: 1,
        itemStyle: { color: color },
        data: item
      };
    });

    // Categories 00..23
    const categories = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

    chart.setOption(
      {
        grid: { left: '1%', right: '1%', top: 5, bottom: 25, containLabel: false },
        xAxis: {
          type: "category",
          data: categories,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: true, interval: 0, fontSize: 10, color: '#9CA3AF' }, // Show hour labels? User didn't explicitly ask, but Airflow has them.
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          min: 0, // 0 to 1
          max: 1,
          show: false // Hide Y axis
        },
        tooltip: {
          trigger: "item",
          confine: true,
          formatter: (params) => {
            const point = params.data?.data || {};
            return [
              `Hour: ${point.hourLabel}:00`,
              `State: ${formatState(point.state)}`,
            ].join("<br/>");
          },
        },
        series: [
          {
            type: "bar",
            data: seriesData,
            barWidth: "90%", // Leave small gap (10%)
            barCategoryGap: "10%",
            cursor: 'default',
            emphasis: {
              itemStyle: {
                opacity: 0.8
              }
            }
          },
        ],
      },
      true
    );
  }

  normalizeHourlyRows(date, rows) {
    // DEBUG: Log incoming rows
    // console.log(`[Timeliness] Normalize hourly for ${date}. Rows:`, rows?.length);

    const byHour = new Map();
    (rows || []).forEach((entry) => {
      // API returns hour as string "00" or int 0
      const hStr = String(entry.hour ?? entry.hour_index ?? -1);
      const hourIndex = parseInt(hStr, 10);

      if (Number.isNaN(hourIndex) || hourIndex < 0 || hourIndex > 23) {
        console.warn("[Timeliness] Invalid hour index:", entry);
        return;
      }
      byHour.set(hourIndex, entry);
    });

    const normalized = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const hourLabel = hour.toString().padStart(2, "0");
      const payload = byHour.get(hour) || {};

      // Default state is 'missing' if no record exists for that hour
      // specific logic: if payload empty -> missing
      let state = (payload.state || "missing").toLowerCase();

      const interval = buildHourInterval(date, hourLabel);

      normalized.push({
        value: [hour, 0], // x, y for scatter/custom
        hourIndex: hour,
        hourLabel,
        state,
        intervalStart: payload.interval_start || interval.start,
        intervalEnd: payload.interval_end || interval.end,
        color: STATE_COLORS[state] || STATE_COLORS.default,
      });
    }
    return normalized;
  }

  clearHourly(message = HOUR_LABEL) {
    if (this.hourlyLabel) this.hourlyLabel.textContent = HOUR_LABEL;
    this.showHourlyPlaceholder(message);
  }

  showDailyPlaceholder(message, { html = false } = {}) {
    if (!this.dailyPlaceholder) return;
    this.dailyPlaceholder.hidden = false;
    if (html) this.dailyPlaceholder.innerHTML = message;
    else this.dailyPlaceholder.textContent = message;
    if (this.dailyChartEl) this.dailyChartEl.hidden = true;
  }

  hideDailyPlaceholder() {
    if (this.dailyPlaceholder) this.dailyPlaceholder.hidden = true;
    if (this.dailyChartEl) this.dailyChartEl.hidden = false;
  }

  showHourlyPlaceholder(message) {
    if (!this.hourlyPlaceholder) return;
    this.hourlyPlaceholder.hidden = false;
    this.hourlyPlaceholder.textContent = message;
    if (this.hourlyChartEl) this.hourlyChartEl.hidden = true;
  }

  hideHourlyPlaceholder() {
    if (this.hourlyPlaceholder) this.hourlyPlaceholder.hidden = true;
    if (this.hourlyChartEl) this.hourlyChartEl.hidden = false;
  }

  ensureDailyChart() {
    if (!window.echarts || !this.dailyChartEl) return null;
    if (!this.dailyChart) {
      this.dailyChart = window.echarts.init(this.dailyChartEl);
      this.dailyChart.on("click", (params) => {
        const date = params.data?.data?.date;
        if (date && typeof this.daySelectHandler === "function") {
          // Defer to next frame to avoid ECharts re-entrancy issues (tooltips, etc.)
          requestAnimationFrame(() => {
            this.daySelectHandler(date);
          });
        }
      });
    }
    return this.dailyChart;
  }

  ensureHourlyChart() {
    if (!window.echarts || !this.hourlyChartEl) return null;
    if (!this.hourlyChart) {
      this.hourlyChart = window.echarts.init(this.hourlyChartEl);
    }
    return this.hourlyChart;
  }

  renderHourlySegment(params, api) {
    const data = params.data;
    const hour = data.hourIndex;
    const state = data.state;
    // Calculate coordinates for the full hour duration
    const startCoord = api.coord([hour, 0]);
    const endCoord = api.coord([hour + 1, 0]);

    // Height of the bar
    const barHeight = 24;

    // Width should be exact to ensure they touch adjacent segments
    const width = endCoord[0] - startCoord[0];

    // Border Radius Logic: Round start of hour 0 and end of hour 23
    const r = [0, 0, 0, 0];
    const radius = 12; // Fully rounded ends

    if (hour === 0) {
      r[0] = radius; // Top-left
      r[3] = radius; // Bottom-left
    }
    if (hour === 23) {
      r[1] = radius; // Top-right
      r[2] = radius; // Bottom-right
    }

    // Adjust y to center
    const y = startCoord[1] - barHeight / 2;

    return {
      type: "rect",
      shape: {
        x: startCoord[0],
        y: y,
        width: width,
        height: barHeight,
        r: r,
      },
      style: {
        fill: data.color,
        // Remove stroke to blend adjacent same-colored blocks seamlessly
        stroke: "none",
      },
      textConfig: {
        position: 'inside',
      },
      styleEmphasis: {
        stroke: "#000",
        lineWidth: 1
      },
      data,
    };
  }

  resize() {
    this.dailyChart?.resize();
    this.hourlyChart?.resize();
  }
}

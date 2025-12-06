const STATUS_COLORS = {
  good: "#4CAF50",
  warning: "#FFC107",
  bad: "#E53935",
  default: "#9CA3AF",
  unknown: "#d1d5db",
};

const STATE_COLORS = {
  loaded: "#4CAF50",
  success: "#4CAF50",
  missing: "#E53935",
  failed: "#E53935",
  unknown: "#d1d5db",
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
    this.dailyChart = null;
    this.hourlyChart = null;
    this.dailyData = [];
    this.selectedDay = null;
    this.daySelectHandler = null;
    this.customDailyRenderer = (params, api) => this.renderDailySegment(params, api);
    this.customHourlyRenderer = (params, api) => this.renderHourlySegment(params, api);
    this.handleWindowResize = () => this.resize();
    window.addEventListener("resize", this.handleWindowResize);
  }

  onDaySelected(handler) {
    this.daySelectHandler = handler;
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

  renderDaily(data = null, selectedDay = this.selectedDay) {
    if (Array.isArray(data)) {
      this.dailyData = data;
    }
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
    this.selectedDay = selectedDay || null;
    const categories = this.dailyData.map((item) => item.date);
    const seriesData = this.dailyData.map((item, index) => this.buildDailyPoint(item, index));
    chart.setOption(
      {
        grid: { left: 8, right: 8, top: 8, bottom: 32 },
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
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const point = params.data || {};
            const total = (point.success ?? 0) + (point.fail ?? 0);
            return [
              `Date: ${point.rawDate || "-"}`,
              `Success: ${point.success ?? 0} / ${total || 24}`,
              `Status: ${formatState(point.status)}`,
              `Data interval: ${point.intervalStart || "-"} ~ ${point.intervalEnd || "-"}`,
            ].join("<br/>");
          },
        },
        series: [
          {
            type: "custom",
            renderItem: this.customDailyRenderer,
            data: seriesData,
          },
        ],
      },
      true
    );
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
    const data = params.data;
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
          fill: data.color,
          stroke: data.selected ? "#1A73E8" : "#d1d5db",
          lineWidth: data.selected ? 2 : 1,
        },
      },
      {
        type: "text",
        style: {
          text: data.dayLabel,
          x: x + bandWidth / 2,
          y: y + barHeight / 2,
          fill: data.textColor,
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
    if (this.hourlyLabel) {
      this.hourlyLabel.textContent = `Hourly breakdown • ${date}`;
    }
    const chart = this.ensureHourlyChart();
    if (!chart) {
      this.showHourlyPlaceholder("Charts unavailable.");
      return;
    }
    const normalized = this.normalizeHourlyRows(date, rows);
    this.hideHourlyPlaceholder();
    chart.setOption(
      {
        grid: { left: 18, right: 12, top: 32, bottom: 24 },
        xAxis: {
          type: "value",
          min: 0,
          max: 24,
          interval: 1,
          axisLabel: {
            formatter: (value) => (Number.isInteger(value) ? value.toString().padStart(2, "0") : ""),
          },
          splitLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          type: "category",
          data: [""],
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const point = params.data || {};
            return [
              `Hour: ${point.hourLabel}:00`,
              `State: ${formatState(point.state)}`,
              `Data interval: ${point.intervalStart} ~ ${point.intervalEnd}`,
            ].join("<br/>");
          },
        },
        series: [
          {
            type: "custom",
            renderItem: this.customHourlyRenderer,
            data: normalized,
          },
        ],
      },
      true
    );
  }

  normalizeHourlyRows(date, rows) {
    const byHour = new Map();
    (rows || []).forEach((entry) => {
      const hourIndex = Number(entry.hour ?? entry.hour_index ?? 0);
      if (Number.isNaN(hourIndex) || hourIndex < 0 || hourIndex > 23) return;
      byHour.set(hourIndex, entry);
    });
    const normalized = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const hourLabel = hour.toString().padStart(2, "0");
      const payload = byHour.get(hour) || {};
      const state = String(payload.state || "unknown").toLowerCase();
      const interval = buildHourInterval(date, hourLabel);
      normalized.push({
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
        const date = params.data?.rawDate;
        if (date && typeof this.daySelectHandler === "function") {
          this.daySelectHandler(date);
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
    const startCoord = api.coord([hour, 0]);
    const endCoord = api.coord([hour + 1, 0]);
    const barHeight = api.size([0, 1])[1] * 0.6;
    return {
      type: "rect",
      shape: {
        x: startCoord[0],
        y: startCoord[1] - barHeight / 2,
        width: Math.max(endCoord[0] - startCoord[0], 2),
        height: barHeight,
      },
      style: {
        fill: data.color,
      },
      data,
    };
  }

  resize() {
    this.dailyChart?.resize();
    this.hourlyChart?.resize();
  }
}

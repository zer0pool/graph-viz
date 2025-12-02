const STATUS_COLORS = {
  good: "#4CAF50",
  warning: "#FFC107",
  bad: "#E53935",
  default: "#9CA3AF",
};

const STATE_COLORS = {
  loaded: "#4CAF50",
  success: "#4CAF50",
  missing: "#E53935",
  failed: "#E53935",
  default: "#9CA3AF",
};

const HOUR_LABEL = "Select a day to view hourly detail.";
const formatState = (value) => {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

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
    this.prevSelectedIndex = null;
    this.customHourlyRenderer = (params, api) => this.renderHourlySegment(params, api);
    this.handleWindowResize = () => this.resize();
    window.addEventListener("resize", this.handleWindowResize);
  }

  onDaySelected(handler) {
    this.daySelectHandler = handler;
  }

  reset(message = 'Select "Load timeline v2" tab to load timeliness data.') {
    this.dailyData = [];
    this.selectedDay = null;
    this.prevSelectedIndex = null;
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
    if (!this.dailyChart || typeof this.dailyChart.dispatchAction !== "function") return;
    this.dailyChart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    this.dailyChart.dispatchAction({ type: "unselect", seriesIndex: 0 });
    if (!this.dailyData?.length || !date) {
      this.prevSelectedIndex = null;
      return;
    }
    const index = this.dailyData.findIndex((item) => item.date === date);
    if (index >= 0) {
      this.dailyChart.dispatchAction({ type: "select", seriesIndex: 0, dataIndex: index });
      this.dailyChart.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: index });
      this.prevSelectedIndex = index;
    }
  }

  renderDaily(data, selectedDay = null) {
    this.dailyData = Array.isArray(data) ? data : [];
    this.selectedDay = selectedDay;
    if (!this.dailyData.length) {
      this.showDailyPlaceholder("No timeliness information for this table.");
      return;
    }
    const chart = this.ensureDailyChart();
    if (!chart) {
      this.showDailyPlaceholder("Charts unavailable.");
      return;
    }
    this.hideDailyPlaceholder();
    const categories = this.dailyData.map((item) => item.date);
    const seriesData = this.dailyData.map((item) => {
      const success = item.success_count ?? 0;
      const fail = item.fail_count ?? 0;
      const ratePct = Math.round(((item.rate ?? success / 24) || 0) * 1000) / 10;
      const color = STATUS_COLORS[item.status] || STATUS_COLORS.default;
      return {
        value: Math.min(ratePct, 100),
        date: item.date,
        success,
        fail,
        status: item.status || "unknown",
        total: success + fail || 24,
        itemStyle: { color },
      };
    });
    chart.setOption({
      grid: { left: 12, right: 12, top: 10, bottom: 10, containLabel: true },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#4B5563" },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const point = params.data || {};
          const total = point.total || 24;
          const success = point.success ?? 0;
          const percentage = params.value != null ? `${params.value.toFixed(1)}%` : "-";
          return [
            `Date: ${point.date}`,
            `Success: ${success} / ${total}`,
            `Rate: ${percentage}`,
            `Status: ${point.status}`,
          ].join("<br/>");
        },
      },
      series: [
        {
          type: "bar",
          data: seriesData,
          barWidth: 18,
          itemStyle: { borderRadius: 4 },
          emphasis: { focus: "series" },
          selectedMode: "single",
          select: {
            itemStyle: {
              borderColor: "#1A73E8",
              borderWidth: 2,
              color: (params) => params.data?.itemStyle?.color || STATUS_COLORS.default,
            },
          },
        },
      ],
    });
    this.setSelectedDate(this.selectedDay);
  }

  renderHourly(date, rows) {
    if (this.hourlyLabel) {
      this.hourlyLabel.textContent = date ? `Hourly breakdown • ${date}` : HOUR_LABEL;
    }
    if (!Array.isArray(rows) || !rows.length) {
      this.showHourlyPlaceholder(date ? "No hourly data available for this date." : HOUR_LABEL);
      return;
    }
    const chart = this.ensureHourlyChart();
    if (!chart) {
      this.showHourlyPlaceholder("Charts unavailable.");
      return;
    }
    this.hideHourlyPlaceholder();
    const normalized = rows
      .map((entry) => {
        const hourIndex = Number(entry.hour ?? entry.hour_index ?? 0);
        const state = String(entry.state || "missing").toLowerCase();
        return {
          hourIndex: Number.isNaN(hourIndex) ? 0 : hourIndex,
          hourLabel: entry.hour ?? hourIndex.toString().padStart(2, "0"),
          state,
          intervalStart: entry.interval_start || "-",
          intervalEnd: entry.interval_end || "-",
          color: STATE_COLORS[state] || STATE_COLORS.default,
        };
      })
      .sort((a, b) => a.hourIndex - b.hourIndex);
    chart.setOption({
      grid: { left: 20, right: 12, top: 30, bottom: 20 },
      xAxis: {
        type: "value",
        min: 0,
        max: 24,
        interval: 2,
        axisLabel: { formatter: (value) => `${value}:00` },
        splitLine: { show: false },
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
          const interval =
            point.intervalStart && point.intervalEnd
              ? `${point.intervalStart} → ${point.intervalEnd}`
              : "Not available";
          return [
            `Hour: ${point.hourLabel}:00`,
            `State: ${formatState(point.state)}`,
            `Interval: ${interval}`,
          ].join("<br/>");
        },
      },
      series: [
        {
          type: "custom",
          renderItem: this.customHourlyRenderer,
          encode: { x: 0 },
          data: normalized,
        },
      ],
    });
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
        const date = params.data?.date;
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

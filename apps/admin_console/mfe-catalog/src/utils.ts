export const formatNumber = (value: any): string => {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString();
};

export const formatBytes = (value: any): string => {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return "-";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(num) / Math.log(1024))
  );
  const scaled = num / Math.pow(1024, idx);

  return `${scaled.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export const formatCurrency = (value: any): string => {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
};

export const formatDate = (value: any): string => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // YYYY-MM-DD format
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (diffDays > 7) {
      return dateStr;
    }

    // HH:MM format
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dateStr} ${hh}:${min}`;
  } catch (err) {
    return value;
  }
};

export const formatDuration = (sec: any): string => {
  if (sec === null || sec === undefined) return "-";
  const s = Number(sec);
  if (Number.isNaN(s) || s < 0) return "-";

  const d = Math.floor(s / 86400);
  let rem = s % 86400;
  const h = Math.floor(rem / 3600);
  rem = rem % 3600;
  const m = Math.floor(rem / 60);
  const secLeft = rem % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 && secLeft > 0) parts.push(`${secLeft}s`);
  return parts.join(" ") || "-";
};

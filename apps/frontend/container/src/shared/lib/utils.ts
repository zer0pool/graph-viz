import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with conditional logic
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in hours into a human-readable string (days and hours)
 */
export function formatWindowHours(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const daysText = `${days} day${days > 1 ? "s" : ""}`;
    if (remHours > 0) {
      return `${daysText} ${remHours} hour${remHours > 1 ? "s" : ""}`;
    }
    return daysText;
  }
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

/**
 * Formats an ISO 8601 datetime string to YYYY-MM-DD HH:mm format
 * @param iso ISO 8601 datetime string (e.g., "2026-05-31T08:48:30Z")
 * @returns Formatted string or fallback value if invalid
 */
export function formatDateTime(iso?: string | null, fallback = "Never"): string {
  if (!iso) return fallback;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return fallback;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day} ${h}:${mi}`;
  } catch {
    return fallback;
  }
}

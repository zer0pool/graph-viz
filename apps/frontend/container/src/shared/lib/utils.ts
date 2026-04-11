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

/**
 * Avatar color palette - diverse colors for visual distinction
 */
const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-600", hover: "group-hover:bg-blue-600" },
  { bg: "bg-purple-100", text: "text-purple-600", hover: "group-hover:bg-purple-600" },
  { bg: "bg-pink-100", text: "text-pink-600", hover: "group-hover:bg-pink-600" },
  { bg: "bg-red-100", text: "text-red-600", hover: "group-hover:bg-red-600" },
  { bg: "bg-orange-100", text: "text-orange-600", hover: "group-hover:bg-orange-600" },
  { bg: "bg-amber-100", text: "text-amber-600", hover: "group-hover:bg-amber-600" },
  { bg: "bg-green-100", text: "text-green-600", hover: "group-hover:bg-green-600" },
  { bg: "bg-emerald-100", text: "text-emerald-600", hover: "group-hover:bg-emerald-600" },
  { bg: "bg-teal-100", text: "text-teal-600", hover: "group-hover:bg-teal-600" },
  { bg: "bg-cyan-100", text: "text-cyan-600", hover: "group-hover:bg-cyan-600" },
  { bg: "bg-indigo-100", text: "text-indigo-600", hover: "group-hover:bg-indigo-600" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-600", hover: "group-hover:bg-fuchsia-600" },
];

/**
 * Generate a consistent hash from a string and return a color palette
 * @param name Name or identifier to hash
 * @returns Object with Tailwind color classes {bg, text, hover}
 */
export function getAvatarColor(name?: string) {
  if (!name) {
    return AVATAR_COLORS[0]; // Default to blue
  }

  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Get absolute value and modulo to array length
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

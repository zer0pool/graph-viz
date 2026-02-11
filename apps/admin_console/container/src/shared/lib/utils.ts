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

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Trailing-edge debounce. Coalesces bursty realtime callbacks into a single
 * invocation so we don't spam the database with refetch queries.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 1500) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, wait);
  };
}

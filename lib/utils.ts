import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTtlTooltip(seconds: number): string {
  if (seconds >= 3600) {
    const hours = (seconds / 3600).toFixed(1).replace(/\.0$/, "");
    return `${hours} hour${hours === "1" ? "" : "s"}`;
  } else if (seconds >= 60) {
    const mins = (seconds / 60).toFixed(1).replace(/\.0$/, "");
    return `${mins} minute${mins === "1" ? "" : "s"}`;
  }
  return `${seconds} seconds`;
}

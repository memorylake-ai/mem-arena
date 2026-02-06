import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Base path for app when deployed under a subpath (e.g. /arena). Use for client-side fetch URLs. */
export function getBasePath(): string {
  return "/arena";
}

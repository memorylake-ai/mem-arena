"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function subscribeToIsMobile(callback: () => void) {
  const mediaQuery = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
  );
  mediaQuery.addEventListener("change", callback);
  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

/**
 * Returns true when viewport width is below the mobile breakpoint (768px).
 * SSR-safe: uses useSyncExternalStore so server and first client paint both get false.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribeToIsMobile, getIsMobile, () => false);
}

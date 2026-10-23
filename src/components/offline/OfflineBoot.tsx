"use client";

import { useEffect } from "react";

/**
 * Temporarily disabled (offline feature paused): instead of registering a service
 * worker, this actively removes any service worker and cache storage left behind by
 * the paused feature on devices that already visited while it was live - otherwise
 * those devices would keep running the old worker (stale caches, the old offline
 * fallback behavior) indefinitely even after this rollback ships.
 */
export function OfflineBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      });
    }
    if ("caches" in window) {
      void caches.keys().then((keys) => keys.forEach((key) => void caches.delete(key)));
    }
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Registers the service worker as early as possible, and - only the very first time this
 * device ever activates one, never on a later update - reloads once so the page already
 * open gets its own data cached immediately instead of only after a second visit.
 *
 * `register: false` in next.config.ts's Serwist options disables its own auto-register
 * (still injected as `window.serwist`, just not called) because that default call waits
 * for the window "load" event before registering at all - on a slow mobile connection
 * with a heavy first page, that alone can take 10-30+ seconds, which is most of the
 * reason the service worker wasn't ready before a child went offline in testing.
 * `{ immediate: true }` skips that wait.
 *
 * Registering early still only gets the SW *installing*; it isn't controlling this page
 * yet. Once it activates and claims control (clientsClaim in src/app/sw.ts), the current
 * page's own data requests already happened before that point and were never cached -
 * reloading once re-issues them through the now-controlling SW, so the page the student
 * is already looking at becomes available offline immediately.
 *
 * controllerchange also fires on every later deploy, for every tab open at that moment,
 * the instant the new service worker activates (skipWaiting + clientsClaim) - reloading
 * unconditionally there force-refreshed every active user's page on every deploy, with no
 * warning, including mid-lesson or on a guardian-PIN-gated screen. Only the true first
 * activation (no controller at all when this page loaded) should reload; a later version
 * replacing an already-active one takes over silently for whatever the page fetches next,
 * same as a normal web app update.
 */
export function OfflineBoot() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadControllerOnLoad = !!navigator.serviceWorker.controller;
    void window.serwist?.register({ immediate: true });
    if (hadControllerOnLoad) return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}

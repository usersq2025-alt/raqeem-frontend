"use client";

import { useEffect } from "react";

/**
 * Registers the service worker as early as possible and reloads once, the first time a
 * new one takes control.
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
 * is already looking at becomes available offline immediately instead of only after a
 * second, separate visit. Guarded to run only once per loaded page.
 */
export function OfflineBoot() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void window.serwist?.register({ immediate: true });

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

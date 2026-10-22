"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the hardware/browser back button while `active` is true, calling
 * `onBackAttempt` instead of silently letting the navigation proceed (used to show a
 * confirm-before-leaving dialog on an in-progress lesson/review, which previously had
 * no warning at all).
 *
 * Mechanism: while active, a same-URL sentinel history entry is pushed. Popping it (a
 * real back-press, or a deliberate `router.back()` call from an in-page exit button) is
 * what fires `onBackAttempt` - the URL never actually changes for this step, so nothing
 * visibly navigates yet. From there:
 *  - to actually leave, call `router.back()` again - it pops the real entry beneath the
 *    sentinel, landing cleanly on whatever page was already there (no extra history
 *    entries left behind - previously, entering AND exiting a lesson both pushed new
 *    entries, so leaving via the in-page exit button stacked a duplicate and one back
 *    press from the destination page stepped back INTO the lesson instead of past it).
 *  - to cancel and stay, call `restoreGuard()` to re-arm the sentinel for next time.
 */
export function useGuardedBack(active: boolean, onBackAttempt: () => void) {
  const callbackRef = useRef(onBackAttempt);
  useEffect(() => {
    callbackRef.current = onBackAttempt;
  });
  const sentinelLiveRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    window.history.pushState({ __guard: true }, "", window.location.href);
    sentinelLiveRef.current = true;

    function onPopState() {
      sentinelLiveRef.current = false;
      callbackRef.current();
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Deactivated without the sentinel ever being consumed (the lesson/review just
      // finished, or this unmounted some other way) - pop it silently so a later back
      // press doesn't need two presses to actually leave. If it WAS already consumed
      // (the user confirmed exiting, which itself popped the real entry beneath it),
      // there's nothing left here to undo.
      if (sentinelLiveRef.current) {
        sentinelLiveRef.current = false;
        window.history.back();
      }
    };
  }, [active]);

  function restoreGuard() {
    if (sentinelLiveRef.current) return;
    window.history.pushState({ __guard: true }, "", window.location.href);
    sentinelLiveRef.current = true;
  }

  return { restoreGuard };
}

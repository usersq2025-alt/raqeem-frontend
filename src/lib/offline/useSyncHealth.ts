"use client";

import { useEffect, useState } from "react";
import { db } from "./db";

// dexie-react-hooks isn't a dependency here (just bare dexie), so this polls instead of
// subscribing live - outbox size is tiny (at most a few pending items per child) and a
// few seconds of staleness on a background indicator is harmless.
const POLL_MS = 5000;

// Below this, a failed attempt reads as an ordinary blip (the sync engine already
// retries on every "online" event and tab-foreground) - only genuinely repeated
// failures while the device believes it's online (see syncEngine.ts's drainOutbox,
// which stops retrying as soon as navigator.onLine goes false) are worth surfacing.
const STUCK_AFTER_ATTEMPTS = 3;

/** Counts outbox items that have failed to sync at least STUCK_AFTER_ATTEMPTS times -
 * the "connected but still not syncing" case useOnlineStatus alone can't see (navigator.
 * onLine only reflects the device's own network interface, not whether our server is
 * actually reachable - the same gap offlineLessonPlay.ts's isConnectivityError works
 * around for a single request; this is the same idea for the background sync queue). */
export function useStuckSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const items = await db.outbox.toArray();
        if (!cancelled) setCount(items.filter((item) => item.attempts >= STUCK_AFTER_ATTEMPTS).length);
      } catch {
        // IndexedDB can throw in rare environments (private browsing, quota errors) -
        // this is a best-effort indicator, never worth crashing the shell over.
      }
    };
    void check();
    const interval = window.setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return count;
}

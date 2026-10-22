"use client";

/**
 * Read-through cache for browsing-page GET data (subjects list, units list, unit path,
 * child profile, streak, ...): try the real fetch while online, cache every success,
 * and fall back to the last cached copy on a genuine connectivity failure - same
 * try/catch/fallback shape as offlineLessonPlay.ts's adapter, generalized for read-only
 * content instead of attempt/session state.
 *
 * Without this, these pages were plain Server Components fetching straight from
 * Laravel during render - a service worker has no visibility into that server-to-server
 * call at all, so none of it ever worked offline, and a failed client-side navigation to
 * one of these routes (Next.js's own RSC fetch, not a page reload) wasn't even caught by
 * the app's /offline fallback. Converting them to client-fetched content here is what
 * actually closes that gap.
 */
import { db } from "./db";
import { isConnectivityError, isOnline } from "./connectivity";

export class OfflineNoCacheError extends Error {
  status = 0;
  constructor() {
    super("OFFLINE_NO_CACHED_CONTENT");
  }
}

export async function getCachedContent<T>(key: string): Promise<T | undefined> {
  const row = await db.contentCache.get(key);
  return row?.data as T | undefined;
}

export async function setCachedContent(key: string, data: unknown): Promise<void> {
  await db.contentCache.put({ key, data, cachedAt: Date.now() });
}

/** `fetcher` is only ever called while isOnline() is true - callers don't need to guard
 * that themselves. */
export async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (isOnline()) {
    try {
      const data = await fetcher();
      void setCachedContent(key, data);
      return data;
    } catch (err) {
      if (!isConnectivityError(err)) throw err;
      const cached = await getCachedContent<T>(key);
      if (cached !== undefined) return cached;
      throw err;
    }
  }
  const cached = await getCachedContent<T>(key);
  if (cached !== undefined) return cached;
  throw new OfflineNoCacheError();
}

import { db } from "./db";

// Matches @serwist/next/worker's defaultCache cacheName for GET /api/* (src/app/sw.ts).
const API_CACHE_NAME = "apis";

function matchesChild(url: string, childId: number): boolean {
  const { pathname, search } = new URL(url);
  if (new RegExp(`/students/${childId}(?:/|$)`).test(pathname)) return true;
  return new RegExp(`(?:studentId|childId)=${childId}(?:&|$)`).test(search);
}

/**
 * Clears one child's cached API responses (subjects/units/path/streak/hq3d/...) and
 * their local hqState row - called when switching away from this child to another, so
 * a shared family device doesn't show a stale child's cached progress under a
 * different one. Never touches `outbox`: unsent writes must survive a child switch (or
 * a logout) and are always synced scoped to their own stored childId (see
 * src/lib/offline/hqSync.ts), never to whichever child happens to be active when the
 * sync engine next drains the queue.
 */
export async function clearChildLocalData(childId: number): Promise<void> {
  await db.hqState.delete(childId);
  if (typeof caches === "undefined") return;
  const cache = await caches.open(API_CACHE_NAME).catch(() => undefined);
  if (!cache) return;
  const keys = await cache.keys();
  await Promise.all(keys.filter((request) => matchesChild(request.url, childId)).map((request) => cache.delete(request)));
}

/**
 * Clears every child's cached data this device has stored - used on logout, since the
 * next person to use the device may be a different family. Outbox is untouched (see
 * clearChildLocalData); a later login resumes draining it normally.
 */
export async function clearAllChildrenLocalData(): Promise<void> {
  await db.hqState.clear();
  if (typeof caches !== "undefined") await caches.delete(API_CACHE_NAME);
}
